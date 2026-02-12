"""
Flask application factory
"""
from flask import Flask, session, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_cors import CORS
from flask_wtf.csrf import CSRFProtect
from app.config import Config

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
csrf = CSRFProtect()

def create_app(config_class=Config):
    """
    Create and configure the Flask application
    """
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    
    # Configure CORS
    CORS(app, 
         origins=app.config.get('CORS_ORIGINS', 'http://localhost:5173'),
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization', 'X-PWA-Standalone'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
    
    # Disable CSRF for API endpoints (use session-based auth instead)
    csrf.init_app(app)
    
    # Disable JSON key sorting so dict insertion order is preserved.
    # Flask 3.x sorts keys alphabetically by default, which breaks
    # intentional column ordering in backup exports and other responses.
    app.json.sort_keys = False
    
    # Configure login manager
    login_manager.login_view = 'auth.login'
    login_manager.session_protection = 'basic'
    
    @login_manager.unauthorized_handler
    def unauthorized_api():
        """Return 401 JSON for unauthenticated API requests.
        Flask-Login's default handler redirects to login_view, but
        axios sends Accept: 'application/json, text/plain, */*' which
        Flask-Login 0.6.x doesn't recognise as JSON (it checks for an
        exact match). The redirect hits the POST-only login endpoint,
        producing a 405 that the frontend's 401 interceptor never sees.
        Returning 401 directly fixes cookie-clear-then-reload."""
        return jsonify({'error': 'Authentication required'}), 401
    
    @login_manager.user_loader
    def load_user(user_id):
        from app.models.user import User
        return User.query.get(int(user_id))
    
    @app.before_request
    def refresh_session():
        """Mark every session as permanent so Flask re-stamps the cookie
        on each response (via SESSION_REFRESH_EACH_REQUEST, default True).
        This turns PERMANENT_SESSION_LIFETIME into a *sliding* window —
        30 min from the last request, not 30 min from login.
        PWA long-lived sessions are handled via Flask-Login's remember
        cookie (auto-set on PWA login), not by mutating the shared
        app.permanent_session_lifetime (which is thread-unsafe under
        Waitress's multi-threaded model)."""
        session.permanent = True
    
    @app.after_request
    def set_api_cache_headers(response):
        """Prevent browser/proxy caching of API responses.
        Without this, browsers may serve stale GET /api/auth/me from
        their HTTP cache even after cookies are cleared, keeping users
        falsely authenticated on the frontend."""
        if request.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        return response
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.users import users_bp
    from app.routes.inviter_groups import inviter_groups_bp
    from app.routes.inviters import inviters_bp
    from app.routes.events import events_bp
    from app.routes.invitees import invitees_bp
    from app.routes.approvals import approvals_bp
    from app.routes.reports import reports_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.import_routes import import_bp
    from app.routes.categories import categories_bp
    from app.routes.attendance import attendance_bp
    from app.routes.portal import portal_bp
    from app.routes.checkin import checkin_bp
    from app.routes.live_dashboard import live_dashboard_bp
    from app.routes.settings import settings_bp
    from app.routes.notifications import notifications_bp
    
    # Exempt API routes from CSRF protection
    csrf.exempt(auth_bp)
    csrf.exempt(users_bp)
    csrf.exempt(inviter_groups_bp)
    csrf.exempt(inviters_bp)
    csrf.exempt(events_bp)
    csrf.exempt(invitees_bp)
    csrf.exempt(approvals_bp)
    csrf.exempt(reports_bp)
    csrf.exempt(dashboard_bp)
    csrf.exempt(import_bp)
    csrf.exempt(categories_bp)
    csrf.exempt(attendance_bp)
    csrf.exempt(portal_bp)
    csrf.exempt(checkin_bp)
    csrf.exempt(live_dashboard_bp)
    csrf.exempt(settings_bp)
    csrf.exempt(notifications_bp)
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(inviter_groups_bp)
    app.register_blueprint(inviters_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(invitees_bp)
    app.register_blueprint(approvals_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(import_bp)
    app.register_blueprint(categories_bp)
    app.register_blueprint(attendance_bp, url_prefix='/api/attendance')
    app.register_blueprint(portal_bp, url_prefix='/api/portal')
    app.register_blueprint(checkin_bp, url_prefix='/api/checkin')
    app.register_blueprint(live_dashboard_bp, url_prefix='/api/live')
    app.register_blueprint(settings_bp)
    app.register_blueprint(notifications_bp)
    
    # Health check route
    @app.route('/health')
    def health_check():
        return {'status': 'healthy'}, 200
    
    return app
