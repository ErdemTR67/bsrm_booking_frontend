# BSRM Booking : Spécification de référence du backend

Tu travailles dans le dépôt existant `BSRM_Booking`.

Cette spécification décrit l’architecture cible complète du backend, mais **tu ne dois jamais implémenter toute l’application en une seule exécution**.

Le développement doit être réalisé en phases successives.

Chaque phase :

1. inspecte le dépôt avant modification ;
2. travaille uniquement sur son périmètre ;
3. conserve ce qui fonctionne déjà ;
4. ajoute uniquement les migrations nécessaires ;
5. exécute les vérifications disponibles ;
6. s’arrête après avoir produit un rapport ;
7. ne commence jamais automatiquement la phase suivante.

---

# 0. Règles permanentes du projet

Stack :

- Python ;
- FastAPI ;
- SQLAlchemy 2 ;
- PostgreSQL ;
- Psycopg 3 ;
- Alembic ;
- Pydantic v2 ;
- Pytest ;
- Docker Compose ;
- `sqlalchemy.orm.Session` synchrone.

Approche :

```text
Modèles SQLAlchemy
→ migrations Alembic
→ PostgreSQL
```

Architecture :

```text
FastAPI Route
→ Pydantic DTO
→ Service métier
→ Repository
→ SQLAlchemy
→ PostgreSQL
```

Responsabilités :

## Routes

Les routes :

- gèrent HTTP ;
- injectent les dépendances ;
- appellent les services ;
- convertissent les exceptions métier en statuts HTTP ;
- déclarent les `response_model`.

Elles ne doivent pas :

- contenir les règles métier ;
- exécuter directement des requêtes SQL complexes.

## DTOs Pydantic

Les DTOs :

- définissent le contrat public de l’API ;
- valident les entrées ;
- filtrent les sorties.

Ne jamais exposer :

```text
password_hash
refresh token hash
secret
champ interne non prévu
```

## Services

Les services :

- appliquent les règles métier ;
- orchestrent les repositories ;
- gèrent les transactions ;
- font `commit()` et `rollback()` ;
- lèvent des exceptions métier.

Ils ne lèvent pas de `HTTPException`.

## Repositories

Les repositories :

- contiennent l’accès SQLAlchemy ;
- font éventuellement `add()` / `flush()` ;
- ne font jamais `commit()` ;
- ne prennent pas de décision de permission ;
- ne lèvent pas de `HTTPException`.

---

# 1. Contraintes absolues

Ne jamais :

- utiliser `Base.metadata.create_all()` ;
- créer les tables manuellement ;
- modifier une ancienne migration déjà appliquée ;
- mettre `.env` ou des secrets dans Git ;
- stocker un mot de passe en clair ;
- stocker un refresh token brut ;
- exposer les modèles ORM directement comme contrat d’API ;
- accepter librement `tenant_id` dans les DTOs publics lorsqu’il est dérivable ;
- utiliser SQLite pour tester des comportements PostgreSQL ;
- faire confiance uniquement au code Python pour les chevauchements de rendez-vous ;
- retourner une ressource d’un autre tenant ;
- annoncer qu’une fonctionnalité fonctionne si elle n’a pas été testée.

---

# 2. Politique de développement

Avant chaque phase :

```text
git status
```

Inspecte les fichiers concernés.

Ne suppose jamais que l’état du dépôt correspond exactement à cette spec.

L’état réel du dépôt fait foi.

Si un fichier ou une fonctionnalité existe déjà :

- inspecte-la ;
- conserve-la si elle est correcte ;
- corrige-la si nécessaire ;
- ne crée pas d’implémentation parallèle.

---

# 3. Environnement et limitations

Avant de lancer Docker, PostgreSQL ou des tests d’intégration, vérifie si l’environnement de développement permet réellement :

```text
docker
docker compose
connexion localhost
connexion PostgreSQL
création de base
exécution Alembic
```

Si une commande n’est pas disponible :

- ne prétends pas qu’elle a été exécutée ;
- effectue les validations statiques possibles ;
- documente précisément la commande que le développeur devra lancer localement.

Exemple :

```text
NON VÉRIFIÉ :
alembic upgrade head

RAISON :
Docker daemon non disponible dans l’environnement de développement.

À EXÉCUTER LOCALEMENT :
alembic upgrade head
```

---

# 4. Workflow Git

Chaque phase doit rester isolée.

Avant une phase, recommande si nécessaire :

```powershell
git checkout -b feature/<nom-phase>
```

Ne crée pas automatiquement une branche si l’environnement ou le workflow actuel ne le permet pas.

À la fin de chaque phase, propose un message de commit explicite :

```text
feat(auth): implement JWT authentication and refresh rotation
```

Ne commit pas automatiquement sauf instruction explicite.

---

# 5. Modèle métier cible

Le système est multi-tenant :

```text
une API
une base PostgreSQL
plusieurs entreprises
```

Entités principales :

```text
Tenant
Location
User
Membership
Employee
Service
EmployeeService
OpeningHour
EmployeeAvailability
TimeOff
LocationClosure
Customer
Appointment
AppointmentService
RefreshToken
```

Relations principales :

```text
Tenant
├── Locations
├── Memberships ─── Users
├── Employees
├── Services
├── Customers
└── Appointments

Location
├── Employees
├── OpeningHours
├── LocationClosures
└── Appointments

Employee
├── EmployeeServices ─── Services
├── EmployeeAvailabilities
├── TimeOff
└── Appointments

Appointment
└── AppointmentServices ─── Services
```

---

# PHASE 1 : Socle et état du dépôt

Objectif :

Valider que le socle technique est cohérent avant de construire dessus.

Inspecter :

```text
app/main.py
app/core/config.py
app/core/database.py
app/models/
migrations/
alembic.ini
compose.yaml
requirements.txt
```

Vérifier :

- SQLAlchemy 2 ;
- moteur PostgreSQL ;
- sessions ;
- Alembic ;
- imports modèles ;
- `.env` ignoré ;
- migrations existantes ;
- Docker Compose PostgreSQL.

Ne développe aucune nouvelle fonctionnalité métier importante.

Vérifications :

```powershell
python -m compileall app
python -c "import app.main; print('App OK')"
python -c "import app.models; print('Models OK')"
alembic current
alembic check
```

Si PostgreSQL est accessible :

```powershell
alembic upgrade head
```

Fin de phase :

Fournis :

- diagnostic ;
- corrections effectuées ;
- commandes réellement exécutées ;
- commandes non exécutables ;
- état des migrations.

STOP.

---

# PHASE 2 : Tenant et Location

Objectif :

Terminer les tranches verticales `Tenant` et `Location`.

Éléments :

```text
schemas
repositories
services
routes
tests
```

Location doit supporter :

```http
POST   /api/v1/tenants/{tenant_id}/locations
GET    /api/v1/tenants/{tenant_id}/locations
GET    /api/v1/tenants/{tenant_id}/locations/{location_id}
PATCH  /api/v1/tenants/{tenant_id}/locations/{location_id}
DELETE /api/v1/tenants/{tenant_id}/locations/{location_id}
```

Contraintes :

```text
UNIQUE (tenant_id, slug)
```

`DELETE` = désactivation logique.

Une location appartenant à un autre tenant retourne `404`.

Tests :

- création ;
- slug dupliqué même tenant ;
- même slug tenant différent ;
- lecture ;
- PATCH ;
- désactivation ;
- `include_inactive` ;
- isolation tenant.

Fin de phase : tests + rapport.

STOP.

---

# PHASE 3 : User et Auth

Objectif :

Implémenter proprement l’identité utilisateur.

Éléments :

```text
User
RefreshToken
security.py
AuthService
Auth routes
DTO auth
```

Hash :

- Argon2 recommandé.

Fonctions :

```text
hash_password
verify_password
create_access_token
decode_access_token
generate_refresh_token
hash_refresh_token
```

Access token :

```text
sub
iat
exp
type=access
```

Refresh token :

- opaque ;
- aléatoire ;
- hashé en base ;
- rotation ;
- révocation.

Routes :

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

Tests :

- register ;
- email dupliqué ;
- login ;
- mauvais mot de passe ;
- user inactif ;
- JWT ;
- refresh ;
- rotation ;
- logout ;
- refresh révoqué.

Ne commence pas encore les permissions tenant avancées.

STOP.

---

# PHASE 4 : Membership et permissions multi-tenant

Objectif :

Relier réellement les users aux tenants.

Membership :

```text
id
tenant_id
user_id
role
is_active
created_at
updated_at
```

Rôles :

```text
owner
admin
manager
staff
```

Contrainte :

```text
UNIQUE (tenant_id, user_id)
```

Créer :

```text
get_current_user
get_current_membership
get_tenant_context
require_roles
```

Contexte :

```python
@dataclass(frozen=True)
class TenantContext:
    tenant_id: UUID
    user_id: UUID
    membership_id: UUID
    role: MembershipRole
```

Règles :

- ressource d’un autre tenant => `404` ;
- permissions insuffisantes => `403` ;
- ne jamais faire confiance au tenant envoyé librement par le client.

Adapter ensuite Tenant et Location pour utiliser le tenant courant.

Tests multi-tenant obligatoires.

STOP.

---

# PHASE 5 : Employee

Objectif :

CRUD des employés.

Employee :

```text
id
tenant_id
location_id
user_id nullable
first_name
last_name
email nullable
phone nullable
display_color nullable
is_bookable
is_active
created_at
updated_at
```

Routes :

```http
POST   /api/v1/employees
GET    /api/v1/employees
GET    /api/v1/employees/{employee_id}
PATCH  /api/v1/employees/{employee_id}
DELETE /api/v1/employees/{employee_id}
```

Filtres :

```text
location_id
is_active
is_bookable
```

Vérifier :

- location du bon tenant ;
- user optionnel avec membership actif ;
- désactivation logique.

STOP.

---

# PHASE 6 : Service et EmployeeService

Objectif :

CRUD prestations + association employés/prestations.

Service :

```text
duration_minutes > 0
buffer_before_minutes >= 0
buffer_after_minutes >= 0
price_cents >= 0 si présent
currency longueur 3
```

Association :

```text
(employee_id, service_id) PK
custom_duration_minutes
custom_price_cents
is_active
```

Routes CRUD services.

Routes association :

```http
PUT    /api/v1/employees/{employee_id}/services/{service_id}
GET    /api/v1/employees/{employee_id}/services
DELETE /api/v1/employees/{employee_id}/services/{service_id}
```

STOP.

---

# PHASE 7 : Horaires

Objectif :

Implémenter :

```text
OpeningHour
LocationClosure
```

OpeningHour :

```text
weekday 0..6
starts_at < ends_at
```

Permettre plusieurs plages le même jour.

Routes horaires + fermetures exceptionnelles.

Tests sur les contraintes temporelles.

STOP.

---

# PHASE 8 : Disponibilités employés

Objectif :

Implémenter :

```text
EmployeeAvailability
TimeOff
```

EmployeeAvailability :

```text
weekday
starts_at
ends_at
valid_from nullable
valid_until nullable
```

TimeOff :

```text
pending
approved
rejected
cancelled
```

Tests temporels et isolation tenant.

STOP.

---

# PHASE 9 : Customers

Objectif :

CRUD clients.

Customer :

```text
tenant_id
first_name
last_name
email nullable
phone nullable
notes nullable
marketing_consent
```

Pas d’unicité globale email/téléphone.

Recherche :

```text
query
email
phone
```

Isolation tenant obligatoire.

STOP.

---

# PHASE 10 : Calcul des disponibilités

Objectif :

Créer le moteur de calcul des créneaux.

Endpoint :

```http
GET /api/v1/availability
```

Entrées :

```text
location_id
employee_id optionnel
service_id
date
slot_interval_minutes
```

Prendre en compte :

1. timezone location ;
2. opening hours ;
3. closures ;
4. employee availability ;
5. approved time-off ;
6. appointments actifs ;
7. durée service ;
8. durée personnalisée employé ;
9. buffer before ;
10. buffer after ;
11. intervalle des slots.

Éviter N requêtes par créneau.

Charger les données utiles puis calculer les intervalles en mémoire.

Tests exhaustifs.

STOP.

---

# PHASE 11 : Appointments

Objectif :

Création et gestion des rendez-vous.

AppointmentCreate reçoit :

```text
location_id
employee_id
service_ids
starts_at
customer_id nullable
customer informations
notes nullable
```

Le client ne fournit pas :

```text
ends_at
prix effectif
durée effective
tenant_id
statut arbitraire
```

Le backend calcule tout.

Transaction atomique :

```text
customer éventuel
appointment
appointment_services
```

Snapshots :

```text
service_name
duration_minutes
price_cents
```

Routes :

```http
POST /api/v1/appointments
GET /api/v1/appointments
GET /api/v1/appointments/{id}
PATCH /api/v1/appointments/{id}
POST /{id}/confirm
POST /{id}/cancel
POST /{id}/complete
POST /{id}/mark-no-show
```

Transitions contrôlées.

STOP.

---

# PHASE 12 : Anti-chevauchement PostgreSQL

Objectif :

Garantir l’intégrité en concurrence.

Migration dédiée :

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
```

Puis :

```sql
EXCLUDE USING gist (
    employee_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
)
WHERE (status IN ('pending', 'confirmed'))
```

Nom :

```text
excl_appointments_employee_time_overlap
```

Tester :

- chevauchement refusé ;
- rendez-vous consécutifs autorisés ;
- employés différents autorisés ;
- cancelled ignoré.

STOP.

---

# PHASE 13 : Tests et durcissement

Objectif :

Compléter la couverture fonctionnelle et d’intégration.

Utiliser PostgreSQL réel pour les tests concernés.

Ajouter fixtures :

```text
session
client
tenant
owner
auth headers
location
employee
service
customer
appointment
```

Vérifier :

```powershell
pytest
alembic check
python -m compileall app
```

Ajouter éventuellement :

```text
ruff
mypy
```

sans surcomplexifier.

STOP.

---

# PHASE 14 : RLS PostgreSQL

Cette phase doit être traitée séparément.

Ne l’exécuter qu’après validation du multi-tenant applicatif.

Tables importantes :

```text
locations
memberships
employees
services
opening_hours
employee_availabilities
time_off
location_closures
customers
appointments
```

Activer :

```sql
ENABLE ROW LEVEL SECURITY
FORCE ROW LEVEL SECURITY
```

Policy :

```sql
tenant_id = current_setting('app.tenant_id', true)::uuid
```

Utiliser :

```sql
USING
WITH CHECK
```

Configurer :

```sql
SET LOCAL app.tenant_id = :tenant_id
```

Tester explicitement les connexions réutilisées par le pool.

Le rôle applicatif :

- ne doit pas être propriétaire des tables ;
- ne doit pas avoir `BYPASSRLS`.

Le rôle Alembic peut rester privilégié.

Si l’environnement ne permet pas de tester PostgreSQL RLS :

NE PAS annoncer que la RLS est validée.

STOP.

---

# PHASE 15 : Production readiness

Objectif :

Finaliser :

```text
CORS
health
ready
logging
Dockerfile
.dockerignore
pagination
README
.env.example
```

Health :

```http
GET /health
GET /ready
```

`/ready` :

```sql
SELECT 1
```

CORS :

- origines explicites ;
- pas de `*` avec credentials en production.

Logs :

Ne jamais logger :

```text
password
JWT complet
refresh token
DATABASE_URL
secret
```

Docker :

Ne jamais copier :

```text
.env
.git
.venv
__pycache__
```

STOP.

---

# Rapport obligatoire à la fin de chaque phase

Retourne uniquement un rapport structuré :

## Modifications

- fichiers créés ;
- fichiers modifiés ;
- fichiers supprimés.

## Base

- migration créée ;
- migration appliquée ou non ;
- état `alembic current` ;
- état `alembic check`.

## Tests

Pour chaque commande :

```text
COMMANDE
RÉSULTAT
```

Distingue explicitement :

```text
TESTÉ
NON TESTÉ
ÉCHEC
```

## Points à revoir

Liste les risques ou dettes éventuelles.

## Git

Propose un message de commit.

Exemple :

```text
feat(employees): implement tenant-scoped employee management
```

Puis STOP.

N’entame jamais la phase suivante sans nouvelle instruction.
