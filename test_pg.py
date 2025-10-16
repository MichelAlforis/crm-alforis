import psycopg

# Connexion locale sans mot de passe
conn = psycopg.connect("dbname=postgres user=test host=localhost")

with conn.cursor() as cur:
    cur.execute("SELECT version();")
    print("Connexion OK →", cur.fetchone()[0])

    # Exemple création table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL
        );
    """)
    conn.commit()

    # Insert et lecture
    cur.execute("INSERT INTO users (name) VALUES (%s) RETURNING id;", ("Michel",))
    new_id = cur.fetchone()[0]
    print(f"Nouvel utilisateur inséré, id={new_id}")

    cur.execute("SELECT * FROM users;")
    print("Contenu de la table :", cur.fetchall())

conn.close()
