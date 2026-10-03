# Student Organization Management System

## Frontend Development Specification

Build the frontend for a college Student Organization Management System.

### Technology

Use only:

```text
HTML
CSS
Vanilla JavaScript
```

Backend:

```text
Node.js
Express.js
MongoDB
```

Do NOT use React.

The frontend must consume backend REST APIs using:

```javascript
fetch()
```

---

# 1. FIVE USER ROLES

Create separate dashboards for:

```text
Student
Volunteer
Admin
Treasurer
Organizer
```

After login, the frontend should redirect the user according to their role.

Example:

```text
student   → /student/dashboard.html
volunteer → /volunteer/dashboard.html
admin     → /admin/dashboard.html
treasurer → /treasurer/dashboard.html
organizer → /organizer/dashboard.html
```

Never allow a user to access another role's dashboard through normal navigation.

Backend authorization remains the actual security layer.

---

# 2. COMMON UI

All dashboards should have:

```text
Sidebar
Top Navbar
Page Title
User Profile
Notifications
Logout
Main Content
```

Use a consistent design across all 5 modules.

Common components:

```text
Sidebar
Navbar
Cards
Tables
Forms
Modal
Search
Filters
Pagination
Status badges
Buttons
Toast notifications
Confirmation dialogs
Loading indicator
Empty states
Error states
```

---

# 3. STUDENT SIDEBAR

```text
Dashboard
My Profile
Membership
Events
My Tickets
Merchandise
My Orders
Announcements
Notifications
Logout
```

## Dashboard

Show:

```text
Membership Status
Upcoming Events
Registered Events
Active Tickets
Pending Orders
Unread Notifications
```

Quick actions:

```text
Browse Events
My Tickets
Shop Merchandise
View Announcements
```

---

# 4. STUDENT PROFILE

Fields:

```text
Student ID
Full Name
Email
Phone
Profile Photo
Date of Birth
Gender
Department
Program
Semester
Academic Year
Address
City
State
Pincode
Username
Account Status
Joined Date
Last Login
```

Allow:

```text
Edit Profile
Change Password
Upload Profile Photo
```

---

# 5. MEMBERSHIP

Display:

```text
Membership ID
Membership Type
Member Since
Start Date
End Date
Membership Status
Benefits
```

Actions:

```text
Apply
Renew
View Membership
```

---

# 6. STUDENT EVENTS

Event cards/table should show:

```text
Event ID
Event Name
Banner
Description
Category
Organizer
Start Date
End Date
Start Time
End Time
Venue
Address
Capacity
Available Seats
Registration Fee
Registration Deadline
Status
```

Actions:

```text
View Details
Register
Cancel Registration
View Ticket
```

Search/filter by:

```text
Event Name
Category
Date
Organizer
Status
Fee
```

---

# 7. STUDENT TICKETS

Fields:

```text
Ticket ID
Event ID
Event Name
Student Name
Ticket Type
Price
Registration Date
Ticket Status
Payment Status
QR Code
Check-in Status
Check-in Time
```

Actions:

```text
View Ticket
Show QR
Download/Print Ticket
```

---

# 8. MERCHANDISE

Product card:

```text
Product Image
Product Name
Category
Description
Price
Available Stock
Sizes
Variants
Status
```

Actions:

```text
View
Add to Cart
Buy
```

---

# 9. STUDENT ORDERS

Fields:

```text
Order ID
Order Date
Products
Quantity
Total Amount
Payment Status
Order Status
Delivery Method
Delivery Address
Payment Method
```

Actions:

```text
View Order
Cancel Order
```

---

# 10. VOLUNTEER SIDEBAR

```text
Dashboard
My Tasks
Events
QR Scanner
Fundraisers
My Expenses
Notifications
Logout
```

---

# 11. VOLUNTEER DASHBOARD

Display:

```text
Assigned Tasks
Pending Tasks
Completed Tasks
Upcoming Events
Active Fundraisers
Pending Expenses
```

---

# 12. MY TASKS

Fields:

```text
Task ID
Title
Description
Event
Assigned By
Deadline
Priority
Status
Instructions
Attachments
Completion Note
Created Date
Completed Date
```

Priority:

```text
Low
Medium
High
Urgent
```

Status:

```text
Pending
In Progress
Completed
Cancelled
```

Actions:

```text
View
Start Task
Mark In Progress
Mark Completed
Add Completion Note
```

---

# 13. VOLUNTEER EVENTS

Display:

```text
Event ID
Event Name
Category
Date
Time
Venue
Organizer
My Role
My Responsibilities
Status
```

---

# 14. QR SCANNER

Create:

```text
Camera/QR Scanner Area
Event Selection
Ticket Information
Check-in Button
```

After scanning show:

```text
Ticket ID
Student Name
Student ID
Event
Ticket Type
Ticket Status
Registration Status
Check-in Status
Check-in Time
```

Actions:

```text
Verify Ticket
Check In
```

---

# 15. FUNDRAISERS

Display:

```text
Fundraiser ID
Name
Purpose
Target Amount
Total Collected
Start Date
End Date
Status
```

Collection form:

```text
Collection ID
Contributor Name
Contributor Contact
Amount
Date
Payment Method
Reference Number
Proof
Notes
```

Verification status should be displayed but Volunteer cannot approve it.

---

# 16. MY EXPENSES

This means:

```text
Money personally spent by Volunteer for organization work.
```

Fields:

```text
Expense ID
Title
Description
Event
Category
Amount
Date
Payment Method
Receipt
Notes
Status
Submitted Date
Reviewed Date
```

Categories:

```text
Food
Transportation
Printing
Decoration
Equipment
Stationery
Other
```

Status:

```text
Pending
Under Review
Approved
Rejected
Reimbursed
```

Actions:

```text
Submit Expense
View Expense
Edit Pending Expense
```

---

# 17. ADMIN SIDEBAR

```text
Dashboard
Members
Events
Tickets
Volunteers
Tasks
Fundraisers
Merchandise
Orders
Announcements
Users & Roles
Organizers
Settings
Logout
```

---

# 18. ADMIN DASHBOARD

Cards:

```text
Total Members
Active Members
Total Events
Upcoming Events
Total Volunteers
Active Volunteers
Total Tickets
Total Orders
Active Fundraisers
Pending Organizer Approvals
```

Tables:

```text
Recent Events
Recent Orders
Pending Tasks
Pending Organizer/Event Approvals
```

---

# 19. ADMIN MEMBERS

Table:

```text
Member ID
Student ID
Name
Email
Phone
Department
Semester
Membership Status
Join Date
Account Status
```

Actions:

```text
View
Edit
Activate
Deactivate
Suspend
```

---

# 20. ADMIN EVENTS

Fields:

```text
Event ID
Event Name
Description
Category
Banner
Organizer
Organization
Start Date
End Date
Start Time
End Time
Venue
Room
Address
Capacity
Registration Deadline
Registration Fee
Registration Count
Available Seats
Status
Created Date
```

Actions:

```text
Create
View
Edit
Publish
Cancel
Delete
View Registrations
View Attendance
```

---

# 21. ORGANIZER APPROVAL

Admin should have a page for:

```text
Pending Organizer Applications
Pending External Events
```

Organizer application:

```text
Organization ID
Organization Name
Organization Type
Official Email
Phone
Website
Address
Contact Person
Contact Email
Contact Phone
Verification Status
```

Actions:

```text
Verify
Reject
Suspend
View Details
```

External event approval:

```text
Event ID
Organization
Event Name
Date
Venue
Capacity
Registration Fee
Status
```

Actions:

```text
Approve
Reject
View Details
```

---

# 22. ADMIN VOLUNTEERS

Fields:

```text
Volunteer ID
Student ID
Name
Email
Phone
Department
Skills
Joined Date
Assigned Events
Active Tasks
Volunteer Status
```

---

# 23. ADMIN TASKS

Fields:

```text
Task ID
Title
Event
Assigned Volunteer
Assigned By
Priority
Deadline
Status
Created Date
Completed Date
```

Actions:

```text
Create Task
Assign
Edit
Delete
View
```

---

# 24. ADMIN FUNDRAISERS

Fields:

```text
Fundraiser ID
Name
Purpose
Target Amount
Start Date
End Date
Assigned Volunteers
Total Collected
Status
```

Actions:

```text
Create
Edit
Assign Volunteers
View Collections
Complete
Cancel
```

---

# 25. ADMIN MERCHANDISE

Fields:

```text
Product ID
Name
Category
Description
Image
Price
Stock
Sizes
Variants
Status
Created Date
```

---

# 26. ADMIN ORDERS

Fields:

```text
Order ID
Student
Order Date
Products
Quantity
Total Amount
Payment Status
Order Status
Delivery/Pickup
Payment Method
```

Actions:

```text
View
Confirm
Prepare
Mark Ready
Mark Delivered
Cancel
```

---

# 27. ADMIN ANNOUNCEMENTS

Fields:

```text
Announcement ID
Title
Message
Category
Audience
Priority
Publish Date
Expiry Date
Created By
Status
```

Audience:

```text
All
Students
Volunteers
Treasurer
Organizers
```

---

# 28. ADMIN USERS & ROLES

Fields:

```text
User ID
Name
Email
Phone
Role
Account Status
Created Date
Last Login
```

Roles:

```text
Student
Volunteer
Admin
Treasurer
Organizer
```

Actions:

```text
Create
Edit
Change Role
Activate
Deactivate
Suspend
Reset Password
```

---

# 29. TREASURER SIDEBAR

```text
Dashboard
Transactions
Income
Expenses
Fundraisers
Reimbursements
Budgets
Financial Reports
Notifications
Logout
```

---

# 30. TREASURER DASHBOARD

Cards:

```text
Total Income
Total Expenses
Current Balance
Pending Reimbursements
Fundraiser Collections
Active Budgets
Monthly Income
Monthly Expenses
```

Charts can show:

```text
Income vs Expenses
Monthly Financial Summary
Fundraiser Collections
Budget Usage
```

---

# 31. TRANSACTIONS

Fields:

```text
Transaction ID
Date
Type
Category
Amount
Payment Method
Reference
Related Event
Related Fundraiser
Description
Created By
Status
```

Type:

```text
Income
Expense
```

Status:

```text
Pending
Verified
Cancelled
```

---

# 32. TREASURER INCOME

Fields:

```text
Income ID
Source
Category
Amount
Date
Payment Method
Reference
Related Event
Related Fundraiser
Received From
Proof
Notes
Status
```

Categories:

```text
Event Registration
Ticket Sales
Merchandise
Membership
Donation
Sponsorship
Fundraiser
Other
```

---

# 33. TREASURER EXPENSE

Fields:

```text
Expense ID
Title
Category
Description
Amount
Date
Event
Paid To
Payment Method
Reference
Receipt
Approved By
Status
```

---

# 34. REIMBURSEMENTS

Fields:

```text
Reimbursement ID
Expense ID
Volunteer
Event
Expense Amount
Receipt
Submitted Date
Reviewed Date
Approved By
Payment Date
Status
```

Status:

```text
Pending
Under Review
Approved
Rejected
Paid
```

---

# 35. BUDGETS

Fields:

```text
Budget ID
Budget Name
Category
Event
Allocated Amount
Used Amount
Remaining Amount
Start Date
End Date
Status
```

---

# 36. FINANCIAL REPORTS

Filters:

```text
Date Range
Event
Category
Transaction Type
Payment Method
```

Reports:

```text
Income Report
Expense Report
Event Financial Report
Fundraiser Report
Reimbursement Report
Budget Report
Monthly Report
```

---

# 37. ORGANIZER SIDEBAR

```text
Dashboard
My Organization
My Events
Create Event
Registrations
Tickets
QR Check-in
Attendance
Event Reports
Announcements
Notifications
Logout
```

---

# 38. ORGANIZER DASHBOARD

Show:

```text
Total Events
Upcoming Events
Completed Events
Total Registrations
Total Attendance
Pending Approvals
```

Quick actions:

```text
Create Event
View Events
View Registrations
QR Check-in
View Reports
```

---

# 39. MY ORGANIZATION

Fields:

```text
Organization ID
Organization Name
Organization Type
Logo
Description
Official Email
Phone
Website
Address
City
State
Country
Contact Person
Contact Email
Contact Phone
Verification Status
```

Organizer can edit permitted organization information.

---

# 40. ORGANIZER CREATE EVENT

Fields:

```text
Event Name
Description
Category
Banner
Start Date
End Date
Start Time
End Time
Venue
Room
Address
Registration Start
Registration Deadline
Maximum Capacity
Registration Fee
Contact Person
Contact Email
Contact Phone
Eligibility
Age Requirement
Semester Requirement
Instructions
Terms & Conditions
```

Status:

```text
Draft
Pending Approval
Approved
Rejected
Published
Ongoing
Completed
Cancelled
```

Workflow:

```text
Save Draft
    ↓
Submit for Approval
    ↓
Admin Review
    ↓
Approved / Rejected
    ↓
Published
```

---

# 41. ORGANIZER REGISTRATIONS

Fields:

```text
Registration ID
Event ID
Student Name
Student ID
Email
Registration Date
Payment Status
Registration Status
```

Organizer can see registrations ONLY for its own events.

---

# 42. ORGANIZER TICKETS

Fields:

```text
Ticket ID
Event
Student
Ticket Type
Price
Payment Status
Ticket Status
QR Code
```

Organizer can access tickets only for its own events.

---

# 43. ORGANIZER QR CHECK-IN

Display:

```text
QR Scanner
Event Selection
Ticket ID
Student Name
Student ID
Event
Ticket Type
Ticket Status
Registration Status
Check-in Status
Check-in Time
```

Actions:

```text
Scan
Verify
Check In
```

---

# 44. ORGANIZER ATTENDANCE

Fields:

```text
Student
Student ID
Ticket ID
Registration Status
Check-in Status
Check-in Time
```

Filters:

```text
Event
Date
Check-in Status
```

---

# 45. ORGANIZER EVENT REPORTS

Show:

```text
Total Registrations
Confirmed Registrations
Cancelled Registrations
Total Attendance
No Shows
Ticket Sales
Registration Revenue
Attendance Percentage
```

Filters:

```text
Event
Date
```

---

# 46. ORGANIZER ANNOUNCEMENTS

Organizer can create announcements related to its own events.

Fields:

```text
Announcement ID
Title
Message
Event
Audience
Publish Date
Expiry Date
Status
```

College-wide announcements should require Admin approval.

---

# 47. COMMON STATUS BADGES

Use consistent colors/styles for:

```text
Active
Inactive
Pending
Approved
Rejected
Completed
Cancelled
Paid
Failed
Verified
Under Review
Expired
```

Do not use random status names.

---

# 48. FRONTEND API CONNECTION

Create a central JavaScript API utility.

Example:

```javascript
const API_BASE_URL = "http://localhost:5000/api";
```

All API calls should use this base URL.

Example:

```javascript
fetch(`${API_BASE_URL}/events`)
```

Do not hardcode different URLs throughout every page.

---

# 49. AUTHENTICATION

Create common:

```text
auth.js
api.js
utils.js
```

`auth.js` handles:

```text
Login
Logout
Current User
Token
Role
Route protection
```

`api.js` handles:

```text
GET
POST
PUT
DELETE
```

---

# 50. FOLDER STRUCTURE

Use:

```text
frontend/
│
├── index.html
├── login.html
├── register.html
│
├── css/
│   ├── global.css
│   ├── auth.css
│   ├── dashboard.css
│   ├── forms.css
│   ├── tables.css
│   └── responsive.css
│
├── js/
│   ├── api.js
│   ├── auth.js
│   ├── utils.js
│   ├── navbar.js
│   └── notifications.js
│
├── student/
├── volunteer/
├── admin/
├── treasurer/
└── organizer/
```

Student:

```text
student/
├── dashboard.html
├── profile.html
├── membership.html
├── events.html
├── event-details.html
├── tickets.html
├── merchandise.html
├── product-details.html
├── orders.html
├── order-details.html
├── announcements.html
└── notifications.html
```

Volunteer:

```text
volunteer/
├── dashboard.html
├── tasks.html
├── task-details.html
├── events.html
├── event-details.html
├── qr-scanner.html
├── fundraisers.html
├── fundraiser-details.html
├── expenses.html
├── expense-details.html
└── notifications.html
```

Admin:

```text
admin/
├── dashboard.html
├── members.html
├── member-details.html
├── events.html
├── event-form.html
├── event-details.html
├── tickets.html
├── volunteers.html
├── volunteer-details.html
├── tasks.html
├── task-form.html
├── fundraisers.html
├── fundraiser-form.html
├── merchandise.html
├── product-form.html
├── orders.html
├── order-details.html
├── announcements.html
├── announcement-form.html
├── users-roles.html
├── organizers.html
└── settings.html
```

Treasurer:

```text
treasurer/
├── dashboard.html
├── transactions.html
├── transaction-details.html
├── income.html
├── income-form.html
├── expenses.html
├── expense-details.html
├── fundraisers.html
├── fundraiser-details.html
├── reimbursements.html
├── reimbursement-details.html
├── budgets.html
├── budget-form.html
├── financial-reports.html
└── notifications.html
```

Organizer:

```text
organizer/
├── dashboard.html
├── organization.html
├── events.html
├── event-form.html
├── event-details.html
├── registrations.html
├── tickets.html
├── qr-scanner.html
├── attendance.html
├── event-reports.html
├── announcements.html
└── notifications.html
```

---

# 51. FRONTEND DEVELOPMENT RULE

Do NOT invent new fields.

Use the backend field names exactly.

For example:

Backend:

```text
maximumCapacity
registrationDeadline
registrationFee
```

Frontend must use:

```text
maximumCapacity
registrationDeadline
registrationFee
```

Do not change them to:

```text
maxSeats
deadlineDate
eventPrice
```

---

# 52. FINAL DEVELOPMENT ORDER

### Team 1

Common UI:

```text
Login
Register
Navbar
Sidebar
Dashboard layout
Authentication
```

### Team 2

Student module.

### Team 3

Volunteer module.

### Team 4

Admin module.

### Team 5

Treasurer + Organizer module.

All teams must use the same:

```text
CSS variables
components
button styles
table styles
status styles
form styles
API utility
authentication utility
```

---

# 53. IMPORTANT

The system must look like ONE application.

Do not make:

```text
Student UI → one design
Volunteer UI → completely different design
Admin UI → completely different design
Treasurer UI → completely different design
Organizer UI → completely different design
```

Instead use:

```text
Same application
    ↓
Same design system
    ↓
Different role-based navigation
    ↓
Different role-specific functionality
```

The final frontend should be responsive and usable on:

```text
Desktop
Laptop
Tablet
Mobile
```

Start with the common layout and authentication first, then build each role module.