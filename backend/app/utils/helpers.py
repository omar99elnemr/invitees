"""
Helper functions
"""
from flask import request


def to_utc_isoformat(dt):
    """Convert datetime to ISO format with UTC indicator"""
    return dt.isoformat() + 'Z' if dt else None

def get_client_ip():
    """Get client IP address"""
    if request.environ.get('HTTP_X_FORWARDED_FOR'):
        return request.environ['HTTP_X_FORWARDED_FOR'].split(',')[0]
    return request.environ.get('REMOTE_ADDR', '0.0.0.0')

def paginate(query, page=1, per_page=50):
    """Paginate a query"""
    return query.paginate(page=page, per_page=per_page, error_out=False)

def get_filters_from_request():
    """Extract filters from request args"""
    filters = {}
    
    if request.args.get('event_id'):
        try:
            filters['event_id'] = int(request.args.get('event_id'))
        except ValueError:
            pass
    
    if request.args.get('status'):
        filters['status'] = request.args.get('status')
    
    if request.args.get('inviter_group_id'):
        try:
            filters['inviter_group_id'] = int(request.args.get('inviter_group_id'))
        except ValueError:
            pass
    
    if request.args.get('inviter_id'):
        try:
            filters['inviter_id'] = int(request.args.get('inviter_id'))
        except ValueError:
            pass
    
    if request.args.get('inviter_user_id'):
        try:
            filters['inviter_user_id'] = int(request.args.get('inviter_user_id'))
        except ValueError:
            pass
    
    if request.args.get('is_going'):
        filters['is_going'] = request.args.get('is_going')
    
    if request.args.get('plus_one'):
        filters['plus_one'] = request.args.get('plus_one').lower() == 'true'
    
    if request.args.get('search'):
        filters['search'] = request.args.get('search')
    
    if request.args.get('start_date'):
        filters['start_date'] = request.args.get('start_date')
    
    if request.args.get('end_date'):
        filters['end_date'] = request.args.get('end_date')
    
    if request.args.get('role'):
        filters['role'] = request.args.get('role')
    
    if request.args.get('is_active'):
        filters['is_active'] = request.args.get('is_active').lower() == 'true'
    
    return filters
