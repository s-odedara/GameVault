import json
from django.core.management.base import BaseCommand
from api.models import CachedRawgResponse

class Command(BaseCommand):
    help = 'Seeds the database with fallback RAWG API cache data for offline use.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting to seed fallback data...")

        # Dummy Game Data Generator
        def create_dummy_games(count=40):
            games = []
            for i in range(1, count + 1):
                games.append({
                    "id": 1000 + i,
                    "name": f"Epic Game Vault Title {i}",
                    "released": "2024-05-15",
                    "background_image": f"https://placehold.co/600x400/111827/4361ee?text=Game+{i}",
                    "rating": 4.8,
                    "rating_top": 5,
                    "metacritic": 95,
                    "genres": [{"name": "Action"}, {"name": "RPG"}],
                    "platforms": [{"platform": {"name": "PC"}}, {"platform": {"name": "PlayStation 5"}}]
                })
            return {"count": count, "next": None, "previous": None, "results": games}

        fallbacks = [
            # Explore page default (Top Rated)
            {
                "endpoint": "games",
                "query_params": "metacritic=80%2C100&ordering=-rating&page_size=40",
                "data": create_dummy_games(40)
            },
            # Explore page empty search just in case
            {
                "endpoint": "games",
                "query_params": "page_size=40",
                "data": create_dummy_games(40)
            },
            # GlobalGameDetail sidebar
            {
                "endpoint": "games",
                "query_params": "ordering=-rating&page_size=10",
                "data": create_dummy_games(10)
            },
            # Community
            {
                "endpoint": "games",
                "query_params": "ordering=-added&page_size=6",
                "data": create_dummy_games(6)
            },
            # CollectionPage
            {
                "endpoint": "games",
                "query_params": "page_size=24",
                "data": create_dummy_games(24)
            },
            # Single Game detail fallback (for GlobalGameDetail)
            {
                "endpoint": "games/1001",
                "query_params": "",
                "data": {
                    "id": 1001,
                    "name": "Epic Game Vault Title 1",
                    "description_raw": "This is a fallback offline description for this game. The external API is currently unreachable.",
                    "released": "2024-05-15",
                    "background_image": "https://placehold.co/1200x800/111827/4361ee?text=Game+1",
                    "rating": 4.8,
                    "metacritic": 95,
                    "developers": [{"name": "Vault Studios"}],
                    "publishers": [{"name": "Vault Publishing"}],
                    "genres": [{"name": "Action"}, {"name": "RPG"}],
                    "platforms": [{"platform": {"name": "PC"}}]
                }
            }
        ]

        count = 0
        for fallback in fallbacks:
            obj, created = CachedRawgResponse.objects.update_or_create(
                endpoint=fallback["endpoint"],
                query_params=fallback["query_params"],
                defaults={"data": fallback["data"]}
            )
            if created:
                count += 1
                self.stdout.write(self.style.SUCCESS(f'Created cache for: {obj.endpoint} ? {obj.query_params}'))
            else:
                self.stdout.write(f'Updated cache for: {obj.endpoint} ? {obj.query_params}')

        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {count} fallback entries.'))
