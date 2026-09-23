# Law Firm Management System

A modern web-based Law Firm Management System designed to help lawyers, legal assistants, and law firms manage clients, cases, hearings, documents, tasks, and financial information from one centralized platform.

The system is built with a Next.js frontend and Django REST-style backend connected to PostgreSQL.

---

## Project Overview

The Law Firm Management System provides a centralized workspace for managing legal operations.

The main goal is to make it easier for law firms to:

- Manage client information
- Track legal cases
- Schedule and manage hearings
- Manage legal documents
- Create and track tasks
- Monitor financial transactions
- Review client activity
- Maintain an audit trail
- Access a complete Client 360 profile
- Manage users and permissions

The system is designed with scalability, security, maintainability, and a low-lag user experience in mind.

---

## Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Next.js App Router

### Backend

- Django
- Django REST-style API endpoints
- Python

### Database

- PostgreSQL

### Authentication

- Django authentication
- Custom Django User model
- Django Allauth
- Google authentication support

### Storage

- Supabase Storage integration for legal documents

---

## Main Features

### 1. Dashboard

The lawyer dashboard provides an overview of important information such as:

- Total clients
- Active cases
- Upcoming hearings
- Pending tasks
- Financial information
- Recent activity

The dashboard is designed to give lawyers a quick overview of the current state of their work.

---

### 2. Client Management

The client management system allows authorized users to create and manage clients.

Client information can include:

- Full name
- National ID
- Phone number
- Alternative phone
- Email
- Address
- Date of birth
- Client type
- Notes
- Creation information
- Update information

Supported client types can include:

- Individual
- Organization

---

## Client 360

The Client 360 page provides a centralized view of everything related to a specific client.

A client profile can contain:

- Personal information
- Organization information
- Cases
- Hearings
- Documents
- Tasks
- Financial transactions
- Activity history
- Statistics

The Client 360 page is designed to reduce the need to navigate between multiple parts of the system.

### Client Statistics

The Client 360 system can display statistics such as:

- Number of cases
- Number of hearings
- Number of documents
- Number of tasks
- Number of transactions
- Total invoiced
- Total paid
- Total expenses
- Total refunds
- Current balance

---

## Case Management

The case management system allows lawyers and authorized legal staff to create, update, view, and delete cases.

Each case can contain:

- Case number
- Case title
- Client
- Case type
- Status
- Priority
- Court
- Court number
- Judge
- Opposing party
- Opposing lawyer
- Description
- Opening date
- Closing date
- Assigned lawyer
- Creation date
- Last update date

### Case Statuses

The system supports:

- New
- Active
- Pending
- Closed
- Archived

### Case Priorities

The system supports:

- Low
- Medium
- High
- Urgent

### Case Types

The system supports configurable case types such as:

- Administrative
- Civil
- Commercial
- Criminal
- Family
- Labor
- Personal Status
- Real Estate
- Other

Case types are managed in the backend and can be extended without changing the main case interface.

---

## Hearings

The hearing management system is designed to help lawyers track court hearings and important hearing information.

Hearings can be associated with cases and clients.

The system is intended to support:

- Hearing dates
- Hearing times
- Court information
- Case relationships
- Hearing status
- Notes
- Future scheduling improvements

---

## Document Management

The document management section provides a centralized location for legal documents.

Documents can be associated with:

- Clients
- Cases

The system is designed to support legal document workflows such as:

- Uploading documents
- Viewing documents
- Downloading documents
- Managing document metadata
- Linking documents to clients and cases
- Secure document storage

Supabase Storage is used as part of the document-storage architecture.

---

## Task Management

The task management system allows lawyers and legal assistants to manage work that needs to be completed.

Tasks can be associated with legal cases and clients.

The task system is intended to support:

- Task titles
- Descriptions
- Case relationships
- Client relationships
- Due dates
- Task status
- Priority
- Assigned users
- Task updates

Future improvements can include:

- Recurring tasks
- Task reminders
- Notifications
- Calendar integration
- Advanced filtering

---

## Finance

The finance module is designed to help law firms track financial activity related to clients.

The Client 360 statistics can include:

- Invoices
- Payments
- Expenses
- Refunds
- Outstanding balance

Financial information can be associated with individual clients and their legal work.

Future versions can expand this module into a complete accounting workflow.

---

## Activity and Audit Logs

The system is designed to maintain a history of important activities.

Examples include:

- Client created
- Client updated
- Case created
- Case updated
- Document uploaded
- Task created
- Financial transaction recorded

Audit logging can help law firms maintain accountability and understand changes made within the system.

---

## Authentication and Users

The backend uses a custom Django User model.

The system supports role-based access.

Potential roles include:

- Super Administrator
- Lawyer
- Legal Assistant
- Staff

Permissions are handled according to the user's role and the operation being performed.

Authentication is handled through Django's authentication system and Django Allauth.

Google authentication support is also included in the project architecture.

---

## Project Structure

The project is separated into a frontend and backend.

```text
law-firm-system/
│
├── backend/
│   │
│   ├── accounts/
│   ├── clients/
│   ├── cases/
│   ├── hearings/
│   ├── finance/
│   ├── documents/
│   ├── tasks/
│   ├── staff/
│   ├── audit/
│   ├── notifications/
│   ├── lawyer/
│   │
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── ...
│   │
│   ├── manage.py
│   └── .env
│
└── frontend/
    │
    ├── app/
    │   │
    │   ├── page.tsx
    │   │
    │   └── lawyer/
    │       ├── page.tsx
    │       │
    │       ├── clients/
    │       │   ├── page.tsx
    │       │   └── [id]/
    │       │       └── page.tsx
    │       │
    │       ├── cases/
    │       │   └── page.tsx
    │       │
    │       ├── hearings/
    │       │   └── page.tsx
    │       │
    │       ├── documents/
    │       │   └── page.tsx
    │       │
    │       └── tasks/
    │           └── page.tsx
    │
    ├── public/
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    └── .env.local
```
