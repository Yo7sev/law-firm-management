from allauth.account.forms import LoginForm, SignupForm
from django import forms

from .models import User


class CustomSignupForm(SignupForm):
    role = forms.ChoiceField(
        choices=[
            (
                User.Role.LAWYER,
                User.Role.LAWYER.label,
            ),
            (
                User.Role.LEGAL_ASSISTANT,
                User.Role.LEGAL_ASSISTANT.label,
            ),
            (
                User.Role.ACCOUNTANT,
                User.Role.ACCOUNTANT.label,
            ),
            (
                User.Role.RECEPTIONIST,
                User.Role.RECEPTIONIST.label,
            ),
            (
                User.Role.VIEWER,
                User.Role.VIEWER.label,
            ),
        ],
        label="Requested Role",
        widget=forms.Select(),
    )

    def save(self, request):
        user = super().save(request)

        user.role = self.cleaned_data["role"]
        user.approval_status = User.ApprovalStatus.PENDING
        user.is_active = True
        user.save(
            update_fields=[
                "role",
                "approval_status",
                "is_active",
            ]
        )

        return user


class CustomLoginForm(LoginForm):
    def clean(self):
        cleaned_data = super().clean()

        if not self.user:
            return cleaned_data

        if self.user.is_superuser:
            return cleaned_data

        if self.user.approval_status == User.ApprovalStatus.PENDING:
            raise forms.ValidationError(
                "Your account is still pending approval. "
                "Please wait for the administrator to approve your account."
            )

        if self.user.approval_status == User.ApprovalStatus.REJECTED:
            raise forms.ValidationError(
                "Your account has been rejected. "
                "Please contact the administrator."
            )

        if self.user.approval_status != User.ApprovalStatus.APPROVED:
            raise forms.ValidationError(
                "Your account has not been approved yet."
            )

        return cleaned_data
