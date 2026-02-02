"""
Application entry point
Run this file to start the Flask development server
"""
from app import create_app, db
from app.models import User, InviterGroup, Event, Invitee, EventInvitee, AuditLog

app = create_app()

# Create database tables if they don't exist
with app.app_context():
    db.create_all()

# Flask shell context for easier debugging
@app.shell_context_processor
def make_shell_context():
    return {
        'db': db,
        'User': User,
        'InviterGroup': InviterGroup,
        'Event': Event,
        'Invitee': Invitee,
        'EventInvitee': EventInvitee,
        'AuditLog': AuditLog
    }

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
