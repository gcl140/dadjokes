import json

from channels.generic.websocket import AsyncWebsocketConsumer


def notification_group_name(user_id):
    return f"notifications_{user_id}"


class NotificationConsumer(AsyncWebsocketConsumer):
    """One socket per logged-in user. Joins a per-user group so
    broadcast_notification() (see content/notifications.py) can push a
    JSON payload straight to whichever tabs that user has open, without
    the client having to poll for unread counts.
    """

    async def connect(self):
        user = self.scope.get("user")
        if user is None or not user.is_authenticated:
            await self.close()
            return

        self.group_name = notification_group_name(user.id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # Called when something group_sends {"type": "notification.message", ...}
    async def notification_message(self, event):
        await self.send(text_data=json.dumps(event["data"]))
