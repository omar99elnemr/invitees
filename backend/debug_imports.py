try:
    print("Importing app...")
    from app import create_app
    print("Creating app...")
    app = create_app()
    print("App created.")
    
    print("Importing models...")
    from app.models import User, Invitee, Category
    print("Models imported.")
except Exception as e:
    import traceback
    traceback.print_exc()
