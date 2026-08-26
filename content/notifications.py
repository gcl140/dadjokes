from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .consumers import notification_group_name


def broadcast_notification(notification):
    """Push a just-created Notification to that user's open sockets (if any)
    so the inbox badge / list update live instead of waiting for a reload.
    Safe to call even if no channel layer is configured or nobody's
    connected - group_send to an empty group is a no-op.
    """
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    async_to_sync(channel_layer.group_send)(
        notification_group_name(notification.user_id),
        {
            "type": "notification.message",
            "data": {
                "id": notification.id,
                "message": notification.message,
                "message_type": notification.message_type,
                "created_at": notification.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "unread_count": notification.user.notification_set.filter(is_read=False).count(),
            },
        },
    )
