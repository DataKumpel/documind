# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "passlib[bcrypt]",
# ]
# ///
try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    h = pwd_context.hash("password123")
    print("Hash:", h)
except Exception as e:
    import traceback
    traceback.print_exc()
