import sqlite3


def get_user_by_id(conn: sqlite3.Connection, user_id: int):
    # Fixed: parameterized query prevents injection.
    query = "SELECT id, email FROM users WHERE id = ?"
    return conn.execute(query, (user_id,)).fetchall()

