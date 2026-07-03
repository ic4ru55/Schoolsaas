# Schema global de base de donnees

Ce schema est volontairement global. Les migrations detaillees devront etre ecrites module par module au moment du developpement.

## Principes

- Toutes les tables metier portent `establishment_id`.
- Les suppressions sensibles doivent etre logiques quand c'est necessaire : `deleted_at`.
- Les operations critiques doivent etre journalisees.
- Les notes validees doivent etre verrouillables.
- Les paiements ne doivent pas etre modifies sans trace.
- Les documents generes doivent garder une reference de version.

## Noyau plateforme

### establishments

- id
- name
- legal_name
- type
- address
- city
- country
- phone
- email
- logo_url
- stamp_url
- motto
- currency
- active_academic_year_id
- created_at
- updated_at

### licenses

- id
- establishment_id
- plan_code
- status
- starts_at
- expires_at
- max_students
- last_check_at
- created_at
- updated_at

### enabled_modules

- id
- establishment_id
- module_code
- enabled
- source
- created_at
- updated_at

## Utilisateurs et securite

### users

- id
- full_name
- email
- phone
- password_hash
- status
- last_login_at
- created_at
- updated_at

### roles

- id
- establishment_id
- code
- name
- description
- system_role
- created_at
- updated_at

### permissions

- id
- code
- name
- module_code
- description

### role_permissions

- id
- role_id
- permission_id

### user_roles

- id
- user_id
- establishment_id
- role_id

### audit_logs

- id
- establishment_id
- user_id
- action
- entity_type
- entity_id
- old_values
- new_values
- ip_address
- user_agent
- reason
- created_at

## Scolarite

### academic_years

- id
- establishment_id
- name
- starts_at
- ends_at
- status
- created_at
- updated_at

### periods

- id
- establishment_id
- academic_year_id
- name
- type
- starts_at
- ends_at
- locked_at
- created_at
- updated_at

### levels

- id
- establishment_id
- name
- code
- order_index

### classes

- id
- establishment_id
- academic_year_id
- level_id
- name
- code
- capacity
- main_teacher_id
- created_at
- updated_at

### subjects

- id
- establishment_id
- name
- code
- subject_group
- created_at
- updated_at

### class_subjects

- id
- establishment_id
- class_id
- subject_id
- teacher_id
- coefficient
- created_at
- updated_at

## Personnes

### students

- id
- establishment_id
- matricule
- first_name
- last_name
- gender
- birth_date
- birth_place
- nationality
- photo_url
- status
- created_at
- updated_at

### enrollments

- id
- establishment_id
- student_id
- academic_year_id
- class_id
- enrollment_type
- status
- repeated
- enrolled_at
- created_at
- updated_at

### guardians

- id
- establishment_id
- first_name
- last_name
- phone
- email
- address
- profession
- created_at
- updated_at

### student_guardians

- id
- establishment_id
- student_id
- guardian_id
- relationship
- is_primary

### teachers

- id
- establishment_id
- user_id
- first_name
- last_name
- phone
- email
- status
- employment_type
- created_at
- updated_at

## Notes et bulletins

### assessments

- id
- establishment_id
- academic_year_id
- period_id
- class_subject_id
- name
- max_score
- weight
- locked_at
- created_at
- updated_at

### grades

- id
- establishment_id
- assessment_id
- student_id
- score
- comment
- entered_by
- validated_by
- validated_at
- created_at
- updated_at

### grade_change_logs

- id
- establishment_id
- grade_id
- changed_by
- old_score
- new_score
- reason
- created_at

### report_cards

- id
- establishment_id
- student_id
- academic_year_id
- period_id
- class_id
- average
- rank
- decision
- pdf_url
- generated_by
- generated_at

## Paiements

### fee_items

- id
- establishment_id
- academic_year_id
- level_id
- class_id
- name
- amount
- due_date
- required
- created_at
- updated_at

### student_fee_assignments

- id
- establishment_id
- student_id
- academic_year_id
- fee_item_id
- amount_due
- discount_amount
- scholarship_amount
- created_at
- updated_at

### payments

- id
- establishment_id
- student_id
- academic_year_id
- amount
- method
- reference
- receipt_number
- paid_at
- received_by
- cancelled_at
- cancel_reason
- created_at
- updated_at

### payment_allocations

- id
- establishment_id
- payment_id
- student_fee_assignment_id
- amount

### receipts

- id
- establishment_id
- payment_id
- receipt_number
- pdf_url
- generated_at

## Documents

### document_templates

- id
- establishment_id
- code
- name
- html_template
- css_template
- active
- created_at
- updated_at

### generated_documents

- id
- establishment_id
- template_id
- entity_type
- entity_id
- pdf_url
- generated_by
- generated_at

## Imports

### import_jobs

- id
- establishment_id
- type
- file_name
- status
- mapping
- total_rows
- valid_rows
- error_rows
- started_by
- started_at
- completed_at

### import_errors

- id
- establishment_id
- import_job_id
- row_number
- field
- message
- raw_value

## Sauvegardes

### backup_jobs

- id
- establishment_id
- type
- status
- local_path
- cloud_path
- size_bytes
- checksum
- encrypted
- started_at
- completed_at
- error_message

### restore_jobs

- id
- establishment_id
- backup_job_id
- status
- requested_by
- started_at
- completed_at
- error_message

## Extension universite future

### faculties

- id
- establishment_id
- name
- code

### departments

- id
- establishment_id
- faculty_id
- name
- code

### programs

- id
- establishment_id
- department_id
- name
- code
- degree_type

### semesters

- id
- establishment_id
- program_id
- name
- order_index

### teaching_units

- id
- establishment_id
- semester_id
- code
- name
- credits
- coefficient

### course_elements

- id
- establishment_id
- teaching_unit_id
- code
- name
- credits
- coefficient

