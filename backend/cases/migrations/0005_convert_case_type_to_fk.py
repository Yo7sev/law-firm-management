from django.db import migrations


def migrate_case_types(apps, schema_editor):
    Case = apps.get_model("cases", "Case")
    CaseType = apps.get_model("cases", "CaseType")

    for case in Case.objects.all():
        if not case.case_type:
            raise ValueError(
                f"Case {case.case_number} has an empty case_type."
            )

        case_type = CaseType.objects.filter(
            name=case.case_type
        ).first()

        if not case_type:
            case_type = CaseType.objects.create(
                name=case.case_type,
            )

        case.case_type_ref_id = case_type.id
        case.save(update_fields=["case_type_ref"])


def reverse_case_types(apps, schema_editor):
    Case = apps.get_model("cases", "Case")

    for case in Case.objects.select_related("case_type_ref").all():
        if case.case_type_ref:
            case.case_type = case.case_type_ref.name
            case.save(update_fields=["case_type"])


class Migration(migrations.Migration):

    dependencies = [
        ("cases", "0004_case_case_type_ref"),
    ]

    operations = [
        migrations.RunPython(
            migrate_case_types,
            reverse_case_types,
        ),
        migrations.RemoveField(
            model_name="case",
            name="case_type",
        ),
        migrations.RenameField(
            model_name="case",
            old_name="case_type_ref",
            new_name="case_type",
        ),
    ]