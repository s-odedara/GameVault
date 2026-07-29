"""
🔥 NAYA (Security — File Upload Safety):

Pehle Game.image aur Listing.image sirf Django ke default ImageField
validation par depend karte the — jo sirf ye check karta hai ki Pillow
file ko "kisi bhi" image format ke roop mein decode kar paaye (BMP, TIFF,
ICO jaise rarely-needed formats bhi allow ho jaate, jinke parsers mein
historically security bugs milte rahe hain).

Ab teen layer check hote hain:
  1. Extension whitelist  (.jpg/.jpeg/.png/.webp/.gif)
  2. Size limit            (settings.MAX_UPLOAD_SIZE_MB se)
  3. ASLI content verify   (Pillow se file khol kar uska real format
                            check karte hain — sirf extension par bharosa
                            nahi karte. Isse koi bhi .exe/.php/.sh file ko
                            .jpg rename karke upload nahi kar sakta —
                            Pillow use "not a valid image" bol kar reject
                            kar dega chahe extension jo bhi ho.)

Uploaded files kabhi bhi code ke roop mein execute nahi hote (Django
media serving sirf raw bytes serve karta hai, kisi language interpreter
ko nahi call karta) — par production mein extra isolation ke liye
S3/Cloudinary jaisi alag storage service use karna best practice hai
(dekho DEPLOY_GUIDE.md).
"""
import os
from django.core.exceptions import ValidationError
from django.conf import settings
from PIL import Image

ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
ALLOWED_IMAGE_FORMATS = {'JPEG', 'PNG', 'WEBP', 'GIF'}


def validate_image_file(file):
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValidationError(
            f"Unsupported file type '{ext}'. Allowed types: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}."
        )

    max_bytes = getattr(settings, 'MAX_UPLOAD_SIZE_MB', 5) * 1024 * 1024
    if file.size > max_bytes:
        raise ValidationError(f"File is too large. Maximum size is {settings.MAX_UPLOAD_SIZE_MB}MB.")

    try:
        file.seek(0)  # stream ki shuruaat se padhna guarantee karo
        image = Image.open(file)
        image.verify()  # Corrupt ya disguised non-image file yahin pakdi jaati hai
        detected_format = image.format
    except Exception:
        raise ValidationError("This file isn't a valid image (it may be corrupted, or not actually an image).")
    finally:
        file.seek(0)  # verify() ke baad pointer reset karna zaroori hai, warna save fail hoga

    if detected_format not in ALLOWED_IMAGE_FORMATS:
        raise ValidationError(
            f"Unsupported image format '{detected_format}'. Allowed: {', '.join(sorted(ALLOWED_IMAGE_FORMATS))}."
        )

    return file
