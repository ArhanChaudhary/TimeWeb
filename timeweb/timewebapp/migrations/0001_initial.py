# Generated by Django 3.2.12 on 2022-02-22 02:36

import colorfield.fields
from decimal import Decimal
from django.conf import settings
import django.contrib.auth.models
import django.contrib.auth.validators
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import multiselectfield.db.fields
import timewebapp.models
import timezone_field.fields


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='TimewebUser',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('first_name', models.CharField(blank=True, max_length=150, verbose_name='first name')),
                ('last_name', models.CharField(blank=True, max_length=150, verbose_name='last name')),
                ('is_staff', models.BooleanField(default=False, help_text='Designates whether the user can log into this admin site.', verbose_name='staff status')),
                ('is_active', models.BooleanField(default=True, help_text='Designates whether this user should be treated as active. Unselect this instead of deleting accounts.', verbose_name='active')),
                ('date_joined', models.DateTimeField(default=django.utils.timezone.now, verbose_name='date joined')),
                ('username', models.CharField(max_length=150, validators=[django.contrib.auth.validators.UnicodeUsernameValidator()], verbose_name='username')),
                ('email', models.EmailField(max_length=255, unique=True, verbose_name='email address')),
                ('groups', models.ManyToManyField(blank=True, help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.', related_name='user_set', related_query_name='user', to='auth.Group', verbose_name='groups')),
                ('user_permissions', models.ManyToManyField(blank=True, help_text='Specific permissions for this user.', related_name='user_set', related_query_name='user', to='auth.Permission', verbose_name='user permissions')),
            ],
            options={
                'verbose_name': 'user',
                'verbose_name_plural': 'users',
                'abstract': False,
            },
            managers=[
                ('objects', django.contrib.auth.models.UserManager()),
            ],
        ),
        migrations.CreateModel(
            name='TimewebModel',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200, verbose_name='Name of this Assignment')),
                ('assignment_date', models.DateTimeField(blank=True, null=True, verbose_name='Date Assigned')),
                ('x', models.DateTimeField(blank=True, null=True, verbose_name='Due Date')),
                ('due_time', models.TimeField(null=True)),
                ('soft', models.BooleanField(default=False)),
                ('unit', models.CharField(blank=True, max_length=40, null=True, verbose_name='Name of each Unit of Work')),
                ('y', models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True, validators=[django.core.validators.MinValueValidator(1, "This field's value can't be less than %(limit_value)s")])),
                ('blue_line_start', models.IntegerField(blank=True, null=True)),
                ('skew_ratio', models.DecimalField(blank=True, decimal_places=10, max_digits=17, null=True)),
                ('time_per_unit', models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True, validators=[django.core.validators.MinValueValidator(Decimal('0.01'), "This field's value must be positive")])),
                ('description', models.TextField(blank=True, null=True, verbose_name='Assignment Description')),
                ('works', models.JSONField(blank=True, default=timewebapp.models.list_with_zero)),
                ('funct_round', models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True, validators=[django.core.validators.MinValueValidator(Decimal('0.01'), "This field's value must be positive")], verbose_name='Step Size')),
                ('min_work_time', models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True, validators=[django.core.validators.MinValueValidator(Decimal('0.01'), 'The minimum work time must be positive')], verbose_name='Minimum Daily Work Time in Minutes')),
                ('break_days', multiselectfield.db.fields.MultiSelectField(blank=True, choices=[('1', 'Monday'), ('2', 'Tuesday'), ('3', 'Wednesday'), ('4', 'Thursday'), ('5', 'Friday'), ('6', 'Saturday'), ('0', 'Sunday')], max_length=13, null=True, verbose_name='Working Days')),
                ('fixed_mode', models.BooleanField(default=False)),
                ('dynamic_start', models.IntegerField(blank=True, null=True)),
                ('mark_as_done', models.BooleanField(default=False)),
                ('tags', models.JSONField(blank=True, default=timewebapp.models.empty_list)),
                ('needs_more_info', models.BooleanField(default=False)),
                ('is_google_classroom_assignment', models.BooleanField(default=False)),
                ('has_alerted_due_date_passed_notice', models.BooleanField(default=False)),
                ('alert_due_date_incremented', models.BooleanField(default=False)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='SettingsModel',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('def_break_days', multiselectfield.db.fields.MultiSelectField(blank=True, choices=[('1', 'Monday'), ('2', 'Tuesday'), ('3', 'Wednesday'), ('4', 'Thursday'), ('5', 'Friday'), ('6', 'Saturday'), ('0', 'Sunday')], max_length=13, null=True, verbose_name='Default Work Days')),
                ('def_min_work_time', models.DecimalField(blank=True, decimal_places=2, default=15, max_digits=15, null=True, validators=[django.core.validators.MinValueValidator(Decimal('0.01'), 'The default minimum work time must be positive')], verbose_name='Default Minimum Daily Work Time in Minutes')),
                ('def_due_time', models.TimeField(default=timewebapp.models.get_midnight_time, verbose_name='Default Due Time')),
                ('def_unit_to_minute', models.BooleanField(default=False, verbose_name='Default Unit of Work to "Minute"')),
                ('def_funct_round_minute', models.BooleanField(default=False, verbose_name='Round to Multiples of 5 Minutes')),
                ('def_skew_ratio', models.DecimalField(decimal_places=10, default=1, max_digits=17, verbose_name='Default Curvature')),
                ('ignore_ends', models.BooleanField(default=False, verbose_name='Ignore Minimum Work Time Ends')),
                ('show_advanced_controls', models.BooleanField(default=True, verbose_name='Show "Advanced Controls" beneath the Graph')),
                ('one_graph_at_a_time', models.BooleanField(default=False, verbose_name='Allow Only One Open Graph at a Time')),
                ('close_graph_after_work_input', models.BooleanField(default=False, verbose_name='Close Graph After Submitting Work Input')),
                ('show_progress_bar', models.BooleanField(default=True, verbose_name='Show Graph Progress Bar')),
                ('show_priority', models.BooleanField(default=True, verbose_name='Show Priority')),
                ('highest_priority_color', colorfield.fields.ColorField(default='#e8564a', max_length=18, verbose_name='Highest Priority Color')),
                ('lowest_priority_color', colorfield.fields.ColorField(default='#84d336', max_length=18, verbose_name='Lowest Priority Color')),
                ('assignment_sorting', models.CharField(choices=[('Normal', 'Normal'), ('Reversed', 'Reversed'), ('Tag Name', 'Tag Name')], default='Normal', max_length=8, verbose_name='Assignment Sorting: ')),
                ('assignment_spacing', models.CharField(choices=[('Comfy', 'Comfy'), ('Compact', 'Compact')], default='Comfy', max_length=7, verbose_name='Assignment Spacing')),
                ('default_dropdown_tags', models.JSONField(blank=True, default=timewebapp.models.empty_list, verbose_name='Default Dropdown Tags')),
                ('horizontal_tag_position', models.CharField(choices=[('Left', 'Left'), ('Middle', 'Middle'), ('Right', 'Right')], default='Middle', max_length=6, verbose_name='Horizontal Assignment Tag Position')),
                ('vertical_tag_position', models.CharField(choices=[('Top', 'Top'), ('Bottom', 'Bottom')], default='Top', max_length=6, verbose_name='Vertical Assignment Tag Position')),
                ('background_image', models.ImageField(blank=True, null=True, upload_to=timewebapp.models.create_image_path, verbose_name='Background Image')),
                ('dark_mode', models.BooleanField(default=False, verbose_name='Dark Mode')),
                ('animation_speed', models.CharField(choices=[('1', 'Normal (1x)'), ('0.5', 'Fast (2x)'), ('0', 'None (No animation)')], default='1', max_length=19, verbose_name='Animation Speed')),
                ('timezone', timezone_field.fields.TimeZoneField(blank=True, null=True)),
                ('restore_gc_assignments', models.BooleanField(default=False, verbose_name='Restore Deleted Google Classroom Assignments')),
                ('enable_tutorial', models.BooleanField(default=True, verbose_name='Enable Tutorial')),
                ('oauth_token', models.JSONField(blank=True, default=timewebapp.models.empty_dict)),
                ('added_gc_assignment_ids', models.JSONField(blank=True, default=timewebapp.models.empty_list)),
                ('seen_latest_changelog', models.BooleanField(default=True)),
                ('user', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
