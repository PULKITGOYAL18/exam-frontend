# ExamEvaluate

ExamEvaluate is an examination evaluation system with a React/Vite frontend and Flask/MongoDB backend.

The current implementation includes authentication for:

- Admin
- Faculty
- HOD
- Dean

The system supports password hashing using bcrypt, JWT authentication, MongoDB user storage, employee IDs, account status validation, and role-based dashboard routing.

---

# 1. Project Structure

```text
exam-evaluate/
│
├── backend/
│   ├── README.md
│   ├── app.py
│   ├── requirements.txt
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   │
│   ├── routes/
│   │   └── auth.py
│   │
│   ├── utils/
│   │   └── security.py
│   │
│   └── scripts/
│       ├── create_admin.py
│       └── create_users.py
│
└── frontend/
    ├── package.json
    ├── src/
    └── ...

Starting commands 

For frontend 

npm install 
npm run dev

For backend 

First create a venv with python 3.10 
 pip install requirements.txt
 pip list 
 python app.py 
