import sqlite3


def get_user_by_id(conn: sqlite3.Connection, user_id: str):
    # Vulnerable: string concatenation allows SQL injection.
    query = "SELECT id, email FROM users WHERE id = " + user_id
    return conn.execute(query).fetchall()

