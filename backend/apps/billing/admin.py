from django.contrib import admin

from .models import SubscriptionPlan, Transaction, UserSubscription

admin.site.register(SubscriptionPlan)
admin.site.register(UserSubscription)
admin.site.register(Transaction)
