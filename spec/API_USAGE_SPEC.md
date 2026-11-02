# BSRM Booking : API Usage Specification

## 1. Vue générale

Base locale habituelle : `http://127.0.0.1:8000`. Les routes métier utilisent le préfixe
`/api/v1`; les probes système sont à la racine. Le format principal est JSON, sauf le login,
qui suit OAuth2 et attend `application/x-www-form-urlencoded`.

L'access token JWT est envoyé avec `Authorization: Bearer …`. Le refresh token est opaque,
retourné uniquement lors du login/refresh, stocké haché côté serveur et remplacé à chaque
rotation. Il ne doit pas être envoyé comme Bearer token.

Exemple tenant-scopé :

```http
Authorization: Bearer <access_token>
X-Tenant-ID: 11111111-1111-4111-8111-111111111111
Content-Type: application/json
```

`X-Tenant-ID` est requis pour Employees, Services, EmployeeService, Hours, Closures,
Employee Availability, Time Off, Customers, Availability et Appointments. Il n'est pas requis
pour Auth, `/api/v1/tenants`, ni les routes Location imbriquées sous
`/api/v1/tenants/{tenant_id}` : ces dernières sélectionnent le tenant par le path. Le serveur
vérifie toujours User, Membership et tenant en base. Une ressource étrangère est masquée par
un `404`, y compris avec la RLS PostgreSQL.

Erreur générale :

```json
{"error":{"code":"employee_not_found","message":"Employee not found."}}
```

Une erreur `422` ajoute `details`, liste d'objets `{location, message, type}`. Les collections
Employees, Services, Customers et Appointments sont paginées avec `{items,page,page_size,total}`.

### Exemples de réponses DTO réutilisés ci-dessous

`UserResponse` :

```json
{"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"owner@example.test","first_name":"Ada","last_name":"Owner","is_active":true,"created_at":"2026-08-11T08:00:00Z","updated_at":"2026-08-11T08:00:00Z"}
```

`TokenResponse` :

```json
{"access_token":"<access_token>","refresh_token":"<refresh_token>","token_type":"bearer","expires_in":1800,"refresh_expires_in":2592000}
```

`TenantResponse` :

```json
{"id":"11111111-1111-4111-8111-111111111111","name":"Salon Démo","slug":"salon-demo","is_active":true,"created_at":"2026-08-11T08:05:00Z","updated_at":"2026-08-11T08:05:00Z"}
```

`LocationResponse` :

```json
{"id":"22222222-2222-4222-8222-222222222222","tenant_id":"11111111-1111-4111-8111-111111111111","name":"Bruxelles Centre","slug":"bruxelles-centre","timezone":"Europe/Brussels","address_line_1":"1 rue Exemple","address_line_2":null,"postal_code":"1000","city":"Bruxelles","country_code":"BE","is_active":true,"created_at":"2026-08-11T08:10:00Z","updated_at":"2026-08-11T08:10:00Z"}
```

Les exemples suivants réutilisent ces UUID : tenant `1111…`, location `2222…`, employee
`3333…`, service `4444…`, customer `5555…`, appointment `6666…`.

---

# 2. Authentification

## `POST /api/v1/auth/invitations/accept`

### Objectif

Créer un User à partir d'une invitation valide et créer son Membership dans le tenant prévu.

### Authentification

Public.

### Permissions

Aucune.

### Headers

`Content-Type: application/json`.

### Path parameters

Aucun.

### Query parameters

Aucun.

### Body

`InvitationAcceptRequest`; tous les champs sont obligatoires. L'email et le tenant sont dérivés
de l'invitation et ne doivent jamais être envoyés par le frontend.

```json
{"token":"<invitation_token>","password":"ExamplePassword123!","first_name":"Ada","last_name":"Owner"}
```

### Réponse succès

`201`: `UserResponse`; exemple canonique §1.

### Erreurs possibles

`401 invalid_invitation`: token invalide, expiré, révoqué ou déjà utilisé. `409
invitation_account_exists`: un compte existe déjà pour l'email invité. `422 validation_error`.

### Notes frontend

Le token provient du lien reçu par e-mail. Après succès, supprimer le token de l'URL et
enchaîner avec `/auth/login`. Il n'existe aucun register public.

## `POST /api/v1/auth/invitations/accept-existing`

### Objectif

Rattacher un User déjà existant au tenant d'une invitation.

### Authentification

Bearer token requis; pas de `X-Tenant-ID`.

### Permissions

Le User authentifié doit avoir exactement l'email de l'invitation.

### Headers

`Authorization`, `Content-Type: application/json`.

### Path parameters

Aucun.

### Query parameters

Aucun.

### Body

```json
{"token":"<invitation_token>"}
```

### Réponse succès

`200`: `MembershipResponse` du tenant et du rôle prévus par l'invitation.

### Erreurs possibles

`401 invalid_access_token`; `401 invalid_invitation`; `422 validation_error`.

### Notes frontend

Utiliser ce flux après login lorsqu'une acceptation publique répond
`409 invitation_account_exists`. Le token est consommable une seule fois.

## `POST /api/v1/auth/login`

### Objectif

Authentifier par email/mot de passe et émettre un couple access/refresh.

### Authentification

Public.

### Permissions

Aucune.

### Headers

`Content-Type: application/x-www-form-urlencoded`.

### Path parameters

Aucun.

### Query parameters

Aucun.

### Body

Formulaire OAuth2 : `username` contient l'email et `password` le mot de passe. `grant_type`,
`scope`, `client_id`, `client_secret` sont optionnels.

```text
username=owner%40example.test&password=ExamplePassword123%21
```

### Réponse succès

`200`: `TokenResponse`; exemple canonique §1.

### Erreurs possibles

`401 invalid_credentials`: email ou mot de passe invalide. `403 inactive_user`: User inactif.
`422 validation_error`: formulaire absent/invalide.

### Notes frontend

Utiliser `access_token` comme Bearer et protéger le refresh token selon la stratégie du client.

## `POST /api/v1/auth/refresh`

### Objectif

Faire tourner un refresh token et obtenir un nouveau couple de tokens.

### Authentification

Public; le refresh token dans le body fait foi.

### Permissions

Aucune.

### Headers

`Content-Type: application/json`.

### Path parameters

Aucun.

### Query parameters

Aucun.

### Body

```json
{"refresh_token":"<refresh_token_d'au_moins_32_caractères>"}
```

### Réponse succès

`200`: nouveau `TokenResponse`; exemple canonique §1.

### Erreurs possibles

`401 invalid_refresh_token`: expiré, révoqué, réutilisé ou User inactif. `422`: format invalide.

### Notes frontend

Remplacer atomiquement les deux anciens tokens; l'ancien refresh token devient inutilisable.

## `POST /api/v1/auth/logout`

### Objectif

Révoquer le refresh token courant.

### Authentification

Public; le refresh token est fourni dans le body.

### Permissions

Aucune.

### Headers

`Content-Type: application/json`.

### Path parameters

Aucun.

### Query parameters

Aucun.

### Body

```json
{"refresh_token":"<refresh_token_d'au_moins_32_caractères>"}
```

### Réponse succès

`204`: aucun body.

### Erreurs possibles

`401 invalid_refresh_token`: token absent de la session, expiré ou déjà révoqué. `422`: format invalide.

### Notes frontend

Effacer access token, refresh token, tenant sélectionné et données privées locales après succès.

## `GET /api/v1/auth/me`

### Objectif

Retourner le User correspondant au JWT.

### Authentification

Bearer token requis; pas de `X-Tenant-ID`.

### Permissions

Aucune au-delà d'un User actif.

### Headers

`Authorization: Bearer <access_token>`.

### Path parameters

Aucun.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `UserResponse`; exemple canonique §1.

### Erreurs possibles

`401 invalid_access_token`: token absent, expiré/invalide ou User inactif.

### Notes frontend

Utile au rétablissement de session; ne retourne ni memberships ni tenants.

---

# 2 bis. Administration plateforme

Ces routes constituent le control plane commercial. Elles exigent toutes un User actif portant
un `PlatformRole` actif `platform_admin`, relu en base. Un rôle tenant `admin` ne suffit pas.

## `POST /api/v1/platform/tenants`

### Objectif

Provisionner une nouvelle entreprise sans créer automatiquement de Membership.

### Authentification

Bearer token requis; pas de `X-Tenant-ID`.

### Permissions

`platform_admin` uniquement.

### Headers

`Authorization`, `Content-Type: application/json`.

### Path parameters

Aucun.

### Query parameters

Aucun.

### Body

```json
{"name":"Salon Démo","slug":"salon-demo"}
```

### Réponse succès

`201`: `TenantResponse`; exemple canonique §1.

### Erreurs possibles

`401 invalid_access_token`; `403 insufficient_permissions`; `409 tenant_already_exists`; `422`.

### Notes frontend

Après création, envoyer une invitation `owner`. Ne jamais proposer cette action aux utilisateurs tenant.

## `GET /api/v1/platform/tenants`

### Objectif

Lister tous les tenants, actifs ou inactifs, pour l'administration plateforme.

### Authentification

Bearer token requis; pas de `X-Tenant-ID`.

### Permissions

`platform_admin` uniquement.

### Headers

`Authorization`.

### Path parameters

Aucun.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: tableau de `TenantResponse`.

### Erreurs possibles

`401 invalid_access_token`; `403 insufficient_permissions`.

### Notes frontend

Cette liste globale est distincte de `GET /api/v1/tenants`, limité aux memberships du User.

## `GET /api/v1/platform/tenants/{tenant_id}`

### Objectif

Lire un tenant depuis le control plane.

### Authentification

Bearer token requis; pas de `X-Tenant-ID`.

### Permissions

`platform_admin` uniquement.

### Headers

`Authorization`.

### Path parameters

`tenant_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `TenantResponse`.

### Erreurs possibles

`401`; `403`; `404 tenant_not_found`; `422`.

### Notes frontend

Ne sélectionne pas de TenantContext métier.

## `PATCH /api/v1/platform/tenants/{tenant_id}`

### Objectif

Modifier le nom ou l'état actif d'un tenant depuis la plateforme.

### Authentification

Bearer token requis; pas de `X-Tenant-ID`.

### Permissions

`platform_admin` uniquement.

### Headers

`Authorization`, `Content-Type: application/json`.

### Path parameters

`tenant_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

```json
{"name":"Nouveau nom","is_active":true}
```

### Réponse succès

`200`: `TenantResponse` mis à jour.

### Erreurs possibles

`401`; `403`; `404 tenant_not_found`; `400 tenant_persistence_error`; `422`.

### Notes frontend

Le slug reste non modifiable.

## `DELETE /api/v1/platform/tenants/{tenant_id}`

### Objectif

Désactiver logiquement un tenant depuis la plateforme.

### Authentification

Bearer token requis; pas de `X-Tenant-ID`.

### Permissions

`platform_admin` uniquement.

### Headers

`Authorization`.

### Path parameters

`tenant_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `TenantResponse` avec `is_active:false`.

### Erreurs possibles

`401`; `403`; `404 tenant_not_found`; `400 tenant_persistence_error`; `422`.

### Notes frontend

La désactivation rend les memberships tenant inutilisables.

## `POST /api/v1/platform/tenants/{tenant_id}/invitations`

### Objectif

Créer et envoyer une invitation liée à un tenant et à un rôle précis.

### Authentification

Bearer token requis; pas de `X-Tenant-ID`.

### Permissions

`platform_admin` uniquement.

### Headers

`Authorization`, `Content-Type: application/json`.

### Path parameters

`tenant_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

```json
{"email":"owner@example.test","role":"owner"}
```

### Réponse succès

`201`: `TenantInvitationResponse` avec statut `pending`, expiration et métadonnées. En
développement, `acceptance_url` contient le lien; en production il vaut `null` et l'e-mail est envoyé par SMTP.

### Erreurs possibles

`401`; `403`; `404 tenant_not_found`; `400 invitation_persistence_error`; `503
invitation_delivery_error`; `422`.

### Notes frontend

Une nouvelle invitation révoque l'ancienne invitation encore en attente pour le même email/tenant.

## `GET /api/v1/platform/tenants/{tenant_id}/invitations`

### Objectif

Lister les invitations du tenant et leur statut calculé.

### Authentification

Bearer token requis; pas de `X-Tenant-ID`.

### Permissions

`platform_admin` uniquement.

### Headers

`Authorization`.

### Path parameters

`tenant_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: tableau de `TenantInvitationResponse`; statuts `pending`, `accepted`, `revoked`, `expired`.

### Erreurs possibles

`401`; `403`; `404 tenant_not_found`; `422`.

### Notes frontend

`acceptance_url` n'est jamais réexposé dans cette liste.

## `POST /api/v1/platform/invitations/{invitation_id}/revoke`

### Objectif

Révoquer une invitation encore en attente.

### Authentification

Bearer token requis; pas de `X-Tenant-ID`.

### Permissions

`platform_admin` uniquement.

### Headers

`Authorization`.

### Path parameters

`invitation_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `TenantInvitationResponse` avec statut `revoked`.

### Erreurs possibles

`401`; `403`; `404 invitation_not_found`; `409 invitation_already_resolved`; `422`.

### Notes frontend

Retirer immédiatement toute action d'acceptation pour cette invitation.

---

# 3. Tenant

La sélection par path concerne les routes Tenant/Location. Les autres modules utilisent
`X-Tenant-ID`. Tous les rôles actifs peuvent lire; seuls `owner/admin` modifient un Tenant et
seul `owner` le désactive.

## `GET /api/v1/tenants`

### Objectif

Lister les tenants actifs dont le User possède un Membership actif.

### Authentification

Bearer token requis; pas de `X-Tenant-ID`.

### Permissions

Tout User actif.

### Headers

`Authorization`.

### Path parameters

Aucun.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: tableau de `TenantResponse`, par exemple `[<TenantResponse §1>]`.

### Erreurs possibles

`401 invalid_access_token`.

### Notes frontend

Utiliser le `id` choisi ensuite comme path Tenant/Location ou comme `X-Tenant-ID`.

## `GET /api/v1/tenants/{tenant_id}`

### Objectif

Lire un tenant auquel le User appartient.

### Authentification

Bearer token requis; le path sélectionne le tenant.

### Permissions

`owner`, `admin`, `manager` ou `staff` actif.

### Headers

`Authorization`.

### Path parameters

`tenant_id`: UUID, obligatoire ; il identifie le tenant demandé.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `TenantResponse`; exemple §1.

### Erreurs possibles

`401`; `404 tenant_not_found`: inexistant, inactif ou aucun Membership actif; `422`: UUID invalide.

### Notes frontend

Un `404` ne permet pas de distinguer absence et non-appartenance.

## `PATCH /api/v1/tenants/{tenant_id}`

### Objectif

Modifier le nom ou `is_active`.

### Authentification

Bearer token requis; tenant sélectionné par path.

### Permissions

`owner` ou `admin`.

### Headers

`Authorization`, `Content-Type`.

### Path parameters

`tenant_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Tous les champs sont optionnels : `{"name":"Nouveau nom","is_active":true}`.

### Réponse succès

`200`: `TenantResponse` mis à jour.

### Erreurs possibles

`401`; `403 insufficient_permissions`; `404 tenant_not_found`; `400 tenant_persistence_error`; `422`.

### Notes frontend

Le slug n'est pas modifiable par ce DTO.

## `DELETE /api/v1/tenants/{tenant_id}`

### Objectif

Désactiver logiquement le tenant.

### Authentification

Bearer token requis; tenant sélectionné par path.

### Permissions

`owner` uniquement.

### Headers

`Authorization`.

### Path parameters

`tenant_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `TenantResponse` avec `is_active:false`.

### Erreurs possibles

`401`; `403`; `404 tenant_not_found`; `400 tenant_persistence_error`; `422`.

### Notes frontend

Retirer immédiatement ce tenant de la sélection locale.

---

# 4. Locations

Les cinq routes utilisent `tenant_id` dans le path et jamais `X-Tenant-ID`. Lecture : tous les
rôles actifs. Écriture/désactivation : `owner`, `admin`, `manager`.

## `POST /api/v1/tenants/{tenant_id}/locations`

### Objectif

Créer une Location dans le tenant courant.

### Authentification

Bearer token requis; tenant sélectionné par path.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `Content-Type`.

### Path parameters

`tenant_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

`name` et `slug` obligatoires; timezone=`Europe/Brussels` et country_code=`BE` par défaut.

```json
{"name":"Bruxelles Centre","slug":"bruxelles-centre","timezone":"Europe/Brussels","address_line_1":"1 rue Exemple","address_line_2":null,"postal_code":"1000","city":"Bruxelles","country_code":"BE"}
```

### Réponse succès

`201`: `LocationResponse`; exemple §1.

### Erreurs possibles

`401`; `403`; `404 tenant_not_found`; `409 location_slug_already_exists`; `422`.

### Notes frontend

Le `tenant_id` est dérivé du path, jamais du body.

## `GET /api/v1/tenants/{tenant_id}/locations`

### Objectif

Lister les Locations du tenant.

### Authentification

Bearer token requis; tenant par path.

### Permissions

Tous les rôles actifs.

### Headers

`Authorization`.

### Path parameters

`tenant_id`: UUID, obligatoire.

### Query parameters

`include_inactive`: bool, optionnel, défaut `false`: inclut les Locations désactivées.

### Body

Aucun.

### Réponse succès

`200`: tableau de `LocationResponse`, non paginé.

### Erreurs possibles

`401`; `404 tenant_not_found`; `422`.

### Notes frontend

Passer `include_inactive=true` pour un écran d'administration/ restauration.

## `GET /api/v1/tenants/{tenant_id}/locations/{location_id}`

### Objectif

Lire une Location tenant-scopée.

### Authentification

Bearer token requis; tenant par path.

### Permissions

Tous les rôles actifs.

### Headers

`Authorization`.

### Path parameters

`tenant_id` et `location_id`: UUID, obligatoires.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `LocationResponse`; exemple §1.

### Erreurs possibles

`401`; `404 tenant_not_found/location_not_found`; `422`.

### Notes frontend

Une Location d'un autre tenant retourne `404`.

## `PATCH /api/v1/tenants/{tenant_id}/locations/{location_id}`

### Objectif

Modifier les champs d'une Location.

### Authentification

Bearer token requis; tenant par path.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `Content-Type`.

### Path parameters

`tenant_id`, `location_id`: UUID, obligatoires.

### Query parameters

Aucun.

### Body

Champs optionnels : `name`, `slug`, `timezone`, adresses, `postal_code`, `city`,
`country_code`, `is_active`. Exemple : `{"city":"Ixelles","is_active":true}`.

### Réponse succès

`200`: `LocationResponse` mis à jour.

### Erreurs possibles

`401`; `403`; `404`; `409 location_slug_already_exists`; `400 location_persistence_error`; `422`.

### Notes frontend

Envoyer uniquement les champs modifiés.

## `DELETE /api/v1/tenants/{tenant_id}/locations/{location_id}`

### Objectif

Désactiver logiquement une Location.

### Authentification

Bearer token requis; tenant par path.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`.

### Path parameters

`tenant_id`, `location_id`: UUID, obligatoires.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `LocationResponse` avec `is_active:false`.

### Erreurs possibles

`401`; `403`; `404`; `400 location_persistence_error`; `422`.

### Notes frontend

La ligne n'est pas supprimée; rafraîchir les listes actives.

---

# 5. Memberships

Aucune route publique Membership n'est actuellement exposée. Les memberships sont créés lors
du bootstrap Tenant ou administrés directement en base dans l'état actuel de l'application.

---

# 6. Employees

Toutes les routes exigent Bearer + `X-Tenant-ID`. Lecture : tous les rôles actifs. Écriture :
`owner`, `admin`, `manager`. `location_id` doit appartenir au tenant. Si `user_id` est fourni,
ce User doit être actif et avoir un Membership actif dans ce tenant.

## `POST /api/v1/employees`

### Objectif

Créer un Employee actif, éventuellement lié à un User.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`, `Content-Type`.

### Path parameters

Aucun.

### Query parameters

Aucun.

### Body

`location_id`, `first_name`, `last_name` obligatoires; autres champs nullable;
`is_bookable` vaut `true` par défaut.

```json
{"location_id":"22222222-2222-4222-8222-222222222222","user_id":null,"first_name":"Grace","last_name":"Hopper","email":"grace@example.test","phone":"+32000000000","display_color":"#3366FF","is_bookable":true}
```

### Réponse succès

`201`: `EmployeeResponse` :

```json
{"id":"33333333-3333-4333-8333-333333333333","location_id":"22222222-2222-4222-8222-222222222222","user_id":null,"first_name":"Grace","last_name":"Hopper","email":"grace@example.test","phone":"+32000000000","display_color":"#3366FF","is_bookable":true,"is_active":true,"created_at":"2026-08-11T08:15:00Z","updated_at":"2026-08-11T08:15:00Z"}
```

### Erreurs possibles

`401`; `403`; `404 tenant/location/user_not_found`; `400 employee_persistence_error`; `422`.

### Notes frontend

Ne jamais envoyer `tenant_id`. `user_id` n'est pas requis pour rendre l'employé réservable.

## `GET /api/v1/employees`

### Objectif

Lister et filtrer les Employees du tenant.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

Tous les rôles actifs.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

Aucun.

### Query parameters

`location_id`: UUID optionnel; `is_active`: bool/null, défaut `true`; `is_bookable` -
bool/null; `page`: int ≥1, défaut 1; `page_size`: int 1..100, défaut 20.

### Body

Aucun.

### Réponse succès

`200`: `PageResponse[EmployeeResponse]`, par exemple
`{"items":[<EmployeeResponse ci-dessus>],"page":1,"page_size":20,"total":1}`.

### Erreurs possibles

`401`; `404 tenant_not_found` ou `location_not_found` si le filtre vise un autre tenant; `422`.

### Notes frontend

Utiliser `is_active=false` pour les désactivés, ou omettre explicitement la valeur seulement si
le client sait encoder un paramètre nullable.

## `GET /api/v1/employees/{employee_id}`

### Objectif

Lire un Employee tenant-scopé.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

Tous les rôles actifs.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`employee_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `EmployeeResponse`; exemple dans POST.

### Erreurs possibles

`401`; `404 employee_not_found` (inclut autre tenant); `422`.

### Notes frontend

La lecture peut retourner un Employee désactivé si son ID est connu.

## `PATCH /api/v1/employees/{employee_id}`

### Objectif

Modifier un Employee, sa Location, son éventuel User lié et ses flags.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`, `Content-Type`.

### Path parameters

`employee_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Tous champs optionnels : `location_id`, `user_id`, noms, email, phone, `display_color`,
`is_bookable`, `is_active`. Exemple : `{"is_bookable":false,"display_color":"#999999"}`.

### Réponse succès

`200`: `EmployeeResponse` mis à jour.

### Erreurs possibles

`401`; `403`; `404 employee/location/user_not_found`; `400 employee_persistence_error`; `422`.

### Notes frontend

`user_id:null` détache le User; envoyer uniquement les changements.

## `DELETE /api/v1/employees/{employee_id}`

### Objectif

Désactiver logiquement l'Employee.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`employee_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `EmployeeResponse` avec `is_active:false`.

### Erreurs possibles

`401`; `403`; `404 employee_not_found`; `400 employee_persistence_error`; `422`.

### Notes frontend

Suppression logique; retirer l'Employee des sélecteurs actifs.

---

# 7. Services

Toutes les routes exigent Bearer + `X-Tenant-ID`. Lecture : tous les rôles. Écriture :
`owner/admin/manager`. Un Service peut être global au tenant (`location_id:null`) ou limité à
une Location du même tenant. Prix en centimes; devise exactement trois caractères.

## `POST /api/v1/services`

### Objectif

Créer une prestation active.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`, `Content-Type`.

### Path parameters

Aucun.

### Query parameters

Aucun.

### Body

`name` et `duration_minutes>0` obligatoires; buffers ≥0; prix nullable ≥0; devise 3 caractères.

```json
{"location_id":"22222222-2222-4222-8222-222222222222","name":"Coupe","description":"Coupe classique","duration_minutes":30,"buffer_before_minutes":5,"buffer_after_minutes":10,"price_cents":3500,"currency":"EUR"}
```

### Réponse succès

`201`: `ServiceResponse` :

```json
{"id":"44444444-4444-4444-8444-444444444444","location_id":"22222222-2222-4222-8222-222222222222","name":"Coupe","description":"Coupe classique","duration_minutes":30,"buffer_before_minutes":5,"buffer_after_minutes":10,"price_cents":3500,"currency":"EUR","is_active":true,"created_at":"2026-08-11T08:20:00Z","updated_at":"2026-08-11T08:20:00Z"}
```

### Erreurs possibles

`401`; `403`; `404 tenant/location_not_found`; `400 service_persistence_error`; `422`.

### Notes frontend

`price_cents:null` signifie absence de prix; ne pas envoyer de montant décimal.

## `GET /api/v1/services`

### Objectif

Lister les Services tenant-scopés.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

Tous les rôles actifs.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

Aucun.

### Query parameters

`is_active`: bool/null, défaut `true`; `page`: int ≥1, défaut 1; `page_size`: 1..100,
défaut 20.

### Body

Aucun.

### Réponse succès

`200`: `PageResponse[ServiceResponse]` :
`{"items":[<ServiceResponse ci-dessus>],"page":1,"page_size":20,"total":1}`.

### Erreurs possibles

`401`; `404 tenant_not_found`; `422`.

### Notes frontend

Le filtre par Location n'existe pas sur cette route.

## `GET /api/v1/services/{service_id}`

### Objectif

Lire un Service du tenant.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

Tous les rôles actifs.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`service_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `ServiceResponse`; exemple dans POST.

### Erreurs possibles

`401`; `404 service_not_found`; `422`.

### Notes frontend

Un Service d'un autre tenant est indistinguable d'un ID inexistant.

## `PATCH /api/v1/services/{service_id}`

### Objectif

Modifier configuration, prix, durée, buffers, Location ou activation.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`, `Content-Type`.

### Path parameters

`service_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Tous champs optionnels. Exemple : `{"duration_minutes":45,"price_cents":4200,"location_id":null}`.

### Réponse succès

`200`: `ServiceResponse` mis à jour.

### Erreurs possibles

`401`; `403`; `404 service/location_not_found`; `400 service_persistence_error`; `422`.

### Notes frontend

Changer le Service ne réécrit pas les snapshots des rendez-vous existants.

## `DELETE /api/v1/services/{service_id}`

### Objectif

Désactiver logiquement le Service.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`service_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `ServiceResponse` avec `is_active:false`.

### Erreurs possibles

`401`; `403`; `404 service_not_found`; `400 service_persistence_error`; `422`.

### Notes frontend

Suppression logique; le Service reste référencé dans les snapshots historiques.

---

# 8. EmployeeService

L'association active rend un Employee éligible au Service. `custom_duration_minutes` remplace
la durée de base si non null; `custom_price_cents` remplace le prix de base, y compris dans les
snapshots de rendez-vous. Les buffers restent ceux du Service. Toutes les routes exigent Bearer
+ `X-Tenant-ID`; lecture tous rôles, écriture `owner/admin/manager`.

## `PUT /api/v1/employees/{employee_id}/services/{service_id}`

### Objectif

Créer, mettre à jour ou réactiver l'association.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`, `Content-Type`.

### Path parameters

`employee_id`, `service_id`: UUID, obligatoires et du même tenant.

### Query parameters

Aucun.

### Body

Tous optionnels : durée personnalisée >0, prix personnalisé ≥0, `is_active` défaut true.

```json
{"custom_duration_minutes":40,"custom_price_cents":3900,"is_active":true}
```

### Réponse succès

`200`: `EmployeeServiceResponse` :
`{"employee_id":"33333333-3333-4333-8333-333333333333","service_id":"44444444-4444-4444-8444-444444444444","custom_duration_minutes":40,"custom_price_cents":3900,"is_active":true,"created_at":"2026-08-11T08:25:00Z"}`.

### Erreurs possibles

`401`; `403`; `404 employee/service_not_found`; `400 employee_service_persistence_error`; `422`.

### Notes frontend

Envoyer `{}` pour les valeurs Service par défaut et une association active.

## `GET /api/v1/employees/{employee_id}/services`

### Objectif

Lister les associations de l'Employee.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

Tous les rôles actifs.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`employee_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: tableau non paginé de `EmployeeServiceResponse`.

### Erreurs possibles

`401`; `404 employee_not_found`; `422`.

### Notes frontend

La liste peut contenir des associations inactives; vérifier `is_active`.

## `DELETE /api/v1/employees/{employee_id}/services/{service_id}`

### Objectif

Désactiver logiquement l'association.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`employee_id`, `service_id`: UUID, obligatoires.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `EmployeeServiceResponse` avec `is_active:false`.

### Erreurs possibles

`401`; `403`; `404 employee/service/employee_service_not_found`; `400`; `422`.

### Notes frontend

L'Employee ne sera plus proposé pour ce Service dans Availability.

---

# 9. Opening Hours

Horaires hebdomadaires récurrents d'une Location. Convention issue de `date.weekday()` :
`0=lundi`, `1=mardi`, `2=mercredi`, `3=jeudi`, `4=vendredi`, `5=samedi`, `6=dimanche`.
Plusieurs plages par jour sont admises et `starts_at < ends_at`. Bearer + `X-Tenant-ID`
partout; lecture tous rôles, écriture `owner/admin/manager`.

## `POST /api/v1/locations/{location_id}/opening-hours`

### Objectif

Créer une plage d'ouverture récurrente active.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`, `Content-Type`.

### Path parameters

`location_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

```json
{"weekday":0,"starts_at":"09:00:00","ends_at":"18:00:00"}
```

### Réponse succès

`201`: `OpeningHourResponse` :
`{"id":"77777777-7777-4777-8777-777777777701","location_id":"22222222-2222-4222-8222-222222222222","weekday":0,"starts_at":"09:00:00","ends_at":"18:00:00","is_active":true,"created_at":"2026-08-11T08:30:00Z","updated_at":"2026-08-11T08:30:00Z"}`.

### Erreurs possibles

`401`; `403`; `404 location_not_found`; `400 opening_hour_persistence_error`; `422`: weekday/plage invalide.

### Notes frontend

Les heures sont locales à la timezone de la Location et ne contiennent pas d'offset.

## `GET /api/v1/locations/{location_id}/opening-hours`

### Objectif

Lister les plages de la Location.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

Tous les rôles actifs.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`location_id`: UUID, obligatoire.

### Query parameters

`is_active`: bool/null, optionnel, défaut `true`.

### Body

Aucun.

### Réponse succès

`200`: tableau non paginé de `OpeningHourResponse`.

### Erreurs possibles

`401`; `404 location_not_found`; `422`.

### Notes frontend

Trier/afficher selon weekday puis heure; le repository retourne déjà cet ordre.

## `GET /api/v1/locations/{location_id}/opening-hours/{opening_hour_id}`

### Objectif

Lire une plage précise.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

Tous les rôles actifs.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`location_id`, `opening_hour_id`: UUID, obligatoires.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `OpeningHourResponse`; exemple dans POST.

### Erreurs possibles

`401`; `404 location/opening_hour_not_found`; `422`.

### Notes frontend

Une plage d'une autre Location/tenant est masquée en `404`.

## `PATCH /api/v1/locations/{location_id}/opening-hours/{opening_hour_id}`

### Objectif

Modifier jour, heures ou activation.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`, `Content-Type`.

### Path parameters

`location_id`, `opening_hour_id`: UUID, obligatoires.

### Query parameters

Aucun.

### Body

Champs optionnels : `{"starts_at":"10:00:00","ends_at":"19:00:00","is_active":true}`.

### Réponse succès

`200`: `OpeningHourResponse` mis à jour.

### Erreurs possibles

`401`; `403`; `404`; `400 opening_hour_persistence_error`; `422`.

### Notes frontend

Le couple final d'heures doit toujours respecter `starts_at < ends_at`.

## `DELETE /api/v1/locations/{location_id}/opening-hours/{opening_hour_id}`

### Objectif

Désactiver logiquement la plage.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`location_id`, `opening_hour_id`: UUID, obligatoires.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `OpeningHourResponse` avec `is_active:false`.

### Erreurs possibles

`401`; `403`; `404`; `400`; `422`.

### Notes frontend

Suppression logique, contrairement aux closures.

---

# 10. Location Closures

Une closure est une fermeture exceptionnelle datée, à la différence des Opening Hours
récurrents. Les datetimes doivent inclure une timezone et vérifier `starts_at < ends_at`.

## `POST /api/v1/locations/{location_id}/closures`

### Objectif

Créer une fermeture exceptionnelle.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`, `Content-Type`.

### Path parameters

`location_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

```json
{"starts_at":"2026-08-15T00:00:00+02:00","ends_at":"2026-08-16T00:00:00+02:00","reason":"Jour férié"}
```

### Réponse succès

`201`: `LocationClosureResponse` :
`{"id":"77777777-7777-4777-8777-777777777702","location_id":"22222222-2222-4222-8222-222222222222","starts_at":"2026-08-14T22:00:00Z","ends_at":"2026-08-15T22:00:00Z","reason":"Jour férié","created_at":"2026-08-11T08:35:00Z","updated_at":"2026-08-11T08:35:00Z"}`.

### Erreurs possibles

`401`; `403`; `404 location_not_found`; `400 location_closure_persistence_error`; `422`.

### Notes frontend

Toujours envoyer un offset explicite; l'API peut normaliser la réponse en UTC.

## `GET /api/v1/locations/{location_id}/closures`

### Objectif

Lister toutes les closures de la Location.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

Tous les rôles actifs.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`location_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: tableau non paginé de `LocationClosureResponse`.

### Erreurs possibles

`401`; `404 location_not_found`; `422`.

### Notes frontend

Aucun filtre de date n'est exposé.

## `GET /api/v1/locations/{location_id}/closures/{closure_id}`

### Objectif

Lire une closure précise.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

Tous les rôles actifs.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`location_id`, `closure_id`: UUID, obligatoires.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `LocationClosureResponse`; exemple dans POST.

### Erreurs possibles

`401`; `404 location/location_closure_not_found`; `422`.

### Notes frontend

Isolation par Location et tenant.

## `PATCH /api/v1/locations/{location_id}/closures/{closure_id}`

### Objectif

Modifier dates ou raison.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`, `Content-Type`.

### Path parameters

`location_id`, `closure_id`: UUID, obligatoires.

### Query parameters

Aucun.

### Body

Tous champs optionnels : `{"reason":"Maintenance exceptionnelle"}`.

### Réponse succès

`200`: `LocationClosureResponse` mis à jour.

### Erreurs possibles

`401`; `403`; `404`; `400 location_closure_persistence_error`; `422`.

### Notes frontend

Les dates finales doivent rester timezone-aware et ordonnées.

## `DELETE /api/v1/locations/{location_id}/closures/{closure_id}`

### Objectif

Supprimer physiquement la closure.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`location_id`, `closure_id`: UUID, obligatoires.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`204`: aucun body.

### Erreurs possibles

`401`; `403`; `404`; `400 location_closure_persistence_error`; `422`.

### Notes frontend

Retirer définitivement l'élément de l'état local.

---

# 11. Employee Availability

Disponibilités hebdomadaires d'un Employee, avec la même convention weekday lundi=0 à
dimanche=6. `valid_from`/`valid_until` sont optionnels et bornent la période d'application.

## `POST /api/v1/employees/{employee_id}/availabilities`

### Objectif

Créer une plage de disponibilité active.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`, `Content-Type`.

### Path parameters

`employee_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

```json
{"weekday":0,"starts_at":"09:00:00","ends_at":"17:00:00","valid_from":"2026-08-01","valid_until":"2026-12-31"}
```

### Réponse succès

`201`: `EmployeeAvailabilityResponse` :
`{"id":"77777777-7777-4777-8777-777777777703","employee_id":"33333333-3333-4333-8333-333333333333","weekday":0,"starts_at":"09:00:00","ends_at":"17:00:00","valid_from":"2026-08-01","valid_until":"2026-12-31","is_active":true,"created_at":"2026-08-11T08:40:00Z","updated_at":"2026-08-11T08:40:00Z"}`.

### Erreurs possibles

`401`; `403`; `404 employee_not_found`; `400 employee_availability_persistence_error`; `422`.

### Notes frontend

`valid_until` ne peut pas précéder `valid_from`; les heures sont locales à la Location.

## `GET /api/v1/employees/{employee_id}/availabilities`

### Objectif

Lister les disponibilités de l'Employee.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

Tous les rôles actifs.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`employee_id`: UUID, obligatoire.

### Query parameters

`is_active`: bool/null, défaut `true`.

### Body

Aucun.

### Réponse succès

`200`: tableau non paginé de `EmployeeAvailabilityResponse`.

### Erreurs possibles

`401`; `404 employee_not_found`; `422`.

### Notes frontend

Les périodes expirées restent retournées si elles correspondent au filtre d'activation.

## `GET /api/v1/employees/{employee_id}/availabilities/{availability_id}`

### Objectif

Lire une disponibilité précise.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

Tous les rôles actifs.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`employee_id`, `availability_id`: UUID, obligatoires.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `EmployeeAvailabilityResponse`; exemple dans POST.

### Erreurs possibles

`401`; `404 employee/employee_availability_not_found`; `422`.

### Notes frontend

Un ID étranger retourne `404`.

## `PATCH /api/v1/employees/{employee_id}/availabilities/{availability_id}`

### Objectif

Modifier plage, période ou activation.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`, `Content-Type`.

### Path parameters

`employee_id`, `availability_id`: UUID, obligatoires.

### Query parameters

Aucun.

### Body

Tous champs optionnels : `{"valid_until":"2027-01-31","is_active":true}`.

### Réponse succès

`200`: `EmployeeAvailabilityResponse` mis à jour.

### Erreurs possibles

`401`; `403`; `404`; `400 employee_availability_persistence_error`; `422`.

### Notes frontend

Envoyer la date JSON `YYYY-MM-DD` sans timezone.

## `DELETE /api/v1/employees/{employee_id}/availabilities/{availability_id}`

### Objectif

Désactiver logiquement la disponibilité.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`employee_id`, `availability_id`: UUID, obligatoires.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `EmployeeAvailabilityResponse` avec `is_active:false`.

### Erreurs possibles

`401`; `403`; `404`; `400`; `422`.

### Notes frontend

Suppression logique.

---

# 12. Time Off

Statuts : `pending`, `approved`, `rejected`, `cancelled`. Seul `approved` bloque réellement
les créneaux dans Availability. Toutes les dates doivent inclure une timezone.

## `POST /api/v1/employees/{employee_id}/time-off`

### Objectif

Créer une absence; statut par défaut `pending`.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`, `Content-Type`.

### Path parameters

`employee_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

```json
{"starts_at":"2026-08-20T09:00:00+02:00","ends_at":"2026-08-20T18:00:00+02:00","reason":"Congé","status":"approved"}
```

### Réponse succès

`201`: `TimeOffResponse` :
`{"id":"77777777-7777-4777-8777-777777777704","employee_id":"33333333-3333-4333-8333-333333333333","starts_at":"2026-08-20T07:00:00Z","ends_at":"2026-08-20T16:00:00Z","reason":"Congé","status":"approved","created_at":"2026-08-11T08:45:00Z","updated_at":"2026-08-11T08:45:00Z"}`.

### Erreurs possibles

`401`; `403`; `404 employee_not_found`; `400 time_off_persistence_error`; `422`.

### Notes frontend

Un `pending` est visible mais ne bloque pas les disponibilités calculées.

## `GET /api/v1/employees/{employee_id}/time-off`

### Objectif

Lister les absences de l'Employee.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

Tous les rôles actifs.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`employee_id`: UUID, obligatoire.

### Query parameters

`status`: optionnel : `pending|approved|rejected|cancelled`.

### Body

Aucun.

### Réponse succès

`200`: tableau non paginé de `TimeOffResponse`.

### Erreurs possibles

`401`; `404 employee_not_found`; `422`: statut invalide.

### Notes frontend

Aucun filtre de période n'est exposé.

## `GET /api/v1/employees/{employee_id}/time-off/{time_off_id}`

### Objectif

Lire une absence précise.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

Tous les rôles actifs.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`employee_id`, `time_off_id`: UUID, obligatoires.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `TimeOffResponse`; exemple dans POST.

### Erreurs possibles

`401`; `404 employee/time_off_not_found`; `422`.

### Notes frontend

Isolation par Employee et tenant.

## `PATCH /api/v1/employees/{employee_id}/time-off/{time_off_id}`

### Objectif

Modifier dates, raison ou statut.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`, `Content-Type`.

### Path parameters

`employee_id`, `time_off_id`: UUID, obligatoires.

### Query parameters

Aucun.

### Body

Tous champs optionnels : `{"status":"approved","reason":"Congé validé"}`.

### Réponse succès

`200`: `TimeOffResponse` mis à jour.

### Erreurs possibles

`401`; `403`; `404`; `400 time_off_persistence_error`; `422`.

### Notes frontend

Passer à `approved` modifie immédiatement les résultats Availability concernés.

## `DELETE /api/v1/employees/{employee_id}/time-off/{time_off_id}`

### Objectif

Annuler logiquement l'absence en fixant son statut à `cancelled`.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`employee_id`, `time_off_id`: UUID, obligatoires.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `TimeOffResponse` avec `status:"cancelled"`.

### Erreurs possibles

`401`; `403`; `404`; `400 time_off_persistence_error`; `422`.

### Notes frontend

La ligne n'est pas supprimée et ne bloque plus les créneaux.

---

# 13. Customers

Customers est tenant-scopé. `email`, `phone`, `notes` sont nullable; aucun email/téléphone
n'est globalement unique. Lecture : tous les rôles; mutations : `owner/admin/manager`.

## `POST /api/v1/customers`

### Objectif

Créer un Customer.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`, `Content-Type`.

### Path parameters

Aucun.

### Query parameters

Aucun.

### Body

`first_name` et `last_name` obligatoires; consentement marketing défaut false.

```json
{"first_name":"Marie","last_name":"Client","email":"marie@example.test","phone":"+32123456789","notes":"Préfère le matin","marketing_consent":false}
```

### Réponse succès

`201`: `CustomerResponse` :
`{"id":"55555555-5555-4555-8555-555555555555","first_name":"Marie","last_name":"Client","email":"marie@example.test","phone":"+32123456789","notes":"Préfère le matin","marketing_consent":false,"created_at":"2026-08-11T08:50:00Z","updated_at":"2026-08-11T08:50:00Z"}`.

### Erreurs possibles

`401`; `403`; `404 tenant_not_found`; `400 customer_persistence_error`; `422`.

### Notes frontend

Ne pas dédupliquer côté API sur email/téléphone; `tenant_id` n'appartient pas au DTO.

## `GET /api/v1/customers`

### Objectif

Rechercher et paginer les Customers.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

Tous les rôles actifs.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

Aucun.

### Query parameters

`query`: texte optionnel recherché partiellement dans prénom, nom, email, téléphone;
`email`: égalité insensible à la casse; `phone`: égalité; chacun min. 1 caractère;
`page` ≥1 défaut 1; `page_size` 1..100 défaut 20.

### Body

Aucun.

### Réponse succès

`200`: `PageResponse[CustomerResponse]` :
`{"items":[<CustomerResponse ci-dessus>],"page":1,"page_size":20,"total":1}`.

### Erreurs possibles

`401`; `404 tenant_not_found`; `422`.

### Notes frontend

Les trois filtres peuvent être combinés; encoder `+` dans les téléphones (`%2B`).

## `GET /api/v1/customers/{customer_id}`

### Objectif

Lire un Customer du tenant.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

Tous les rôles actifs.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`customer_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `CustomerResponse`; exemple dans POST.

### Erreurs possibles

`401`; `404 customer_not_found`; `422`.

### Notes frontend

Un Customer étranger est masqué en `404`.

## `PATCH /api/v1/customers/{customer_id}`

### Objectif

Modifier les informations et le consentement.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`, `Content-Type`.

### Path parameters

`customer_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Tous champs optionnels : `{"phone":null,"marketing_consent":true}`.

### Réponse succès

`200`: `CustomerResponse` mis à jour.

### Erreurs possibles

`401`; `403`; `404 customer_not_found`; `400 customer_persistence_error`; `422`.

### Notes frontend

La modification ne réécrit pas les snapshots Customer des rendez-vous existants.

## `DELETE /api/v1/customers/{customer_id}`

### Objectif

Supprimer physiquement le Customer.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`customer_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`204`: aucun body.

### Erreurs possibles

`401`; `403`; `404 customer_not_found`; `400 customer_persistence_error`; `422`.

### Notes frontend

Les Appointment conservent leurs snapshots `customer_name/email/phone`; leur `customer_id`
devient `null` grâce à la FK `ON DELETE SET NULL`. Le `400 customer_persistence_error` reste
réservé à un échec d'intégrité lors de la suppression.

---

# 14. Availability

## `GET /api/v1/availability`

### Objectif

Calculer les créneaux réellement réservables pour une date, une Location et un Service.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

Tous les rôles actifs.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

Aucun.

### Query parameters

- `location_id`: UUID, obligatoire.
- `service_id`: UUID, obligatoire.
- `date`: date `YYYY-MM-DD`, obligatoire.
- `employee_id`: UUID, optionnel; absent = tous les Employees éligibles.
- `slot_interval_minutes`: entier 1..1440, optionnel, défaut 15.

Exemple :

```http
GET /api/v1/availability?location_id=22222222-2222-4222-8222-222222222222&service_id=44444444-4444-4444-8444-444444444444&date=2026-08-17&slot_interval_minutes=15
```

### Body

Aucun.

### Réponse succès

Le contrat réel est `200` avec une liste de `AvailabilitySlotResponse`, pas une enveloppe
`{date,timezone,slots}` :

```json
[
  {
    "employee_id":"33333333-3333-4333-8333-333333333333",
    "service_id":"44444444-4444-4444-8444-444444444444",
    "starts_at":"2026-08-17T09:00:00+02:00",
    "ends_at":"2026-08-17T09:55:00+02:00",
    "duration_minutes":40,
    "buffer_before_minutes":5,
    "buffer_after_minutes":10
  }
]
```

La timezone n'est pas un champ séparé : elle est celle de la Location et apparaît dans les
offsets de `starts_at`/`ends_at`.

### Erreurs possibles

`401`; `404 tenant/location/service/employee_not_found`; `400 availability_calculation_error`
(timezone Location invalide); `422`: paramètres invalides.

### Notes frontend

Les résultats intègrent déjà Opening Hours, Closures, Employee Availability, Time Off
`approved`, Appointments `pending/confirmed`, durée effective, durée personnalisée et buffers.
Le frontend sélectionne un créneau mais doit encore gérer un `409` à la création du rendez-vous.

---

# 15. Appointments

Tous les endpoints exigent Bearer + `X-Tenant-ID`. Lecture : tous les rôles. Création,
modification et transitions : `owner/admin/manager`.

Le backend est source de vérité pour `tenant_id`, `ends_at`, durée/prix effectifs, statut initial
et snapshots. Le frontend envoie exactement une source Customer : `customer_id` ou `customer`.

Transitions autorisées :

```text
pending
├── confirmed
└── cancelled

confirmed
├── completed
├── cancelled
└── no_show
```

## `POST /api/v1/appointments`

### Objectif

Créer atomiquement un Appointment, éventuellement un Customer, et les snapshots Service.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`, `Content-Type`.

### Path parameters

Aucun.

### Query parameters

Aucun.

### Body

`location_id`, `employee_id`, au moins un `service_ids` distinct et `starts_at` timezone-aware.
Fournir exactement `customer_id` ou l'objet `customer`.

```json
{
  "location_id":"22222222-2222-4222-8222-222222222222",
  "employee_id":"33333333-3333-4333-8333-333333333333",
  "service_ids":["44444444-4444-4444-8444-444444444444"],
  "starts_at":"2026-08-17T09:00:00+02:00",
  "customer_id":"55555555-5555-4555-8555-555555555555",
  "customer":null,
  "notes":"Première visite"
}
```

Alternative inline : omettre `customer_id` et fournir
`{"customer":{"first_name":"Marie","last_name":"Client","email":null,"phone":null,"notes":null,"marketing_consent":false}}`.

### Réponse succès

`201`: `AppointmentResponse` :

```json
{"id":"66666666-6666-4666-8666-666666666666","location_id":"22222222-2222-4222-8222-222222222222","employee_id":"33333333-3333-4333-8333-333333333333","customer_id":"55555555-5555-4555-8555-555555555555","starts_at":"2026-08-17T07:00:00Z","ends_at":"2026-08-17T07:55:00Z","status":"pending","customer_name":"Marie Client","customer_email":"marie@example.test","customer_phone":"+32123456789","notes":"Première visite","cancellation_reason":null,"services":[{"id":"88888888-8888-4888-8888-888888888888","service_id":"44444444-4444-4444-8444-444444444444","service_name":"Coupe","duration_minutes":40,"price_cents":3900,"position":0}],"created_at":"2026-08-11T09:00:00Z","updated_at":"2026-08-11T09:00:00Z"}
```

### Erreurs possibles

`401`; `403`; `404 location/employee/service/customer_not_found`; `409 appointment_conflict`
- créneau indisponible ou pris concurremment; `400 appointment_persistence_error`; `422`.

### Notes frontend

Ne jamais envoyer `ends_at`, status, prix, durée, snapshots ou `tenant_id`. Un slot obtenu
précédemment n'est pas une réservation; afficher une relance Availability après `409`.

## `GET /api/v1/appointments`

### Objectif

Filtrer et paginer les rendez-vous du tenant.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

Tous les rôles actifs.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

Aucun.

### Query parameters

`location_id`, `employee_id`, `customer_id`: UUID optionnels; `status` -
`pending|confirmed|completed|cancelled|no_show`; `date_from`, `date_to`: datetimes optionnels
avec timezone, début inclus et fin exclue sur `starts_at`; `page` ≥1 défaut 1;
`page_size` 1..100 défaut 20. Si les deux dates existent, `date_from < date_to`.

### Body

Aucun.

### Réponse succès

`200`: `PageResponse[AppointmentResponse]` :
`{"items":[<AppointmentResponse ci-dessus>],"page":1,"page_size":20,"total":1}`.

### Erreurs possibles

`401`; `404 location/employee/customer_not_found` pour filtre étranger; `400 appointment_persistence_error`
pour dates naïves/inversées; `422`: enum/UUID/pagination invalide.

### Notes frontend

Les snapshots rendent l'affichage historique indépendant des modifications Service/Customer.

## `GET /api/v1/appointments/{appointment_id}`

### Objectif

Lire un Appointment et ses snapshots ordonnés.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

Tous les rôles actifs.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`appointment_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `AppointmentResponse`; exemple dans POST.

### Erreurs possibles

`401`; `404 appointment_not_found`; `422`.

### Notes frontend

Utiliser `services[].position` pour préserver l'ordre.

## `PATCH /api/v1/appointments/{appointment_id}`

### Objectif

Modifier uniquement les notes.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`, `Content-Type`.

### Path parameters

`appointment_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

```json
{"notes":"Client arrivé cinq minutes en avance"}
```

### Réponse succès

`200`: `AppointmentResponse` mis à jour.

### Erreurs possibles

`401`; `403`; `404 appointment_not_found`; `400 appointment_persistence_error`; `422`.

### Notes frontend

Aucun changement de date, employé, service, client ou statut par PATCH.

## `POST /api/v1/appointments/{appointment_id}/confirm`

### Objectif

Transition `pending → confirmed`.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`appointment_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `AppointmentResponse` avec `status:"confirmed"`.

### Erreurs possibles

`401`; `403`; `404 appointment_not_found`; `409 invalid_appointment_transition`; `400`; `422`.

### Notes frontend

Désactiver l'action si le statut local n'est pas `pending`, tout en gérant le `409` serveur.

## `POST /api/v1/appointments/{appointment_id}/cancel`

### Objectif

Transition `pending|confirmed → cancelled`, avec raison optionnelle.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`; `Content-Type` seulement si body envoyé.

### Path parameters

`appointment_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Optionnel : `{"cancellation_reason":"Demande du client"}`; raison max. 255 caractères.

### Réponse succès

`200`: `AppointmentResponse` avec `status:"cancelled"` et la raison.

### Erreurs possibles

`401`; `403`; `404`; `409 invalid_appointment_transition`; `400`; `422`.

### Notes frontend

Un rendez-vous annulé ne bloque plus Availability ni l'exclusion PostgreSQL.

## `POST /api/v1/appointments/{appointment_id}/complete`

### Objectif

Transition `confirmed → completed`.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`appointment_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `AppointmentResponse` avec `status:"completed"`.

### Erreurs possibles

`401`; `403`; `404`; `409 invalid_appointment_transition`; `400`; `422`.

### Notes frontend

Un Appointment pending doit d'abord être confirmé.

## `POST /api/v1/appointments/{appointment_id}/mark-no-show`

### Objectif

Transition `confirmed → no_show`.

### Authentification

Bearer + `X-Tenant-ID` requis.

### Permissions

`owner`, `admin`, `manager`.

### Headers

`Authorization`, `X-Tenant-ID`.

### Path parameters

`appointment_id`: UUID, obligatoire.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `AppointmentResponse` avec `status:"no_show"`.

### Erreurs possibles

`401`; `403`; `404`; `409 invalid_appointment_transition`; `400`; `422`.

### Notes frontend

Le statut API utilise exactement `no_show`, avec underscore.

---

# 16. Pagination

Format réel :

```json
{"items":[],"page":1,"page_size":20,"total":0}
```

Routes paginées :

- `GET /api/v1/employees`
- `GET /api/v1/services`
- `GET /api/v1/customers`
- `GET /api/v1/appointments`

`page` commence à 1. `page_size` vaut 20 par défaut et doit être compris entre 1 et 100.
`total` compte tous les éléments correspondant aux filtres, avant offset/limit. Demander une
page au-delà du résultat retourne `items:[]` avec le même `total`.

Les listes Tenant, Location, EmployeeService, OpeningHour, Closure, EmployeeAvailability et
TimeOff ne sont pas paginées.

---

# 17. Erreurs API

Format métier/HTTP :

```json
{"error":{"code":"insufficient_permissions","message":"You do not have permission to perform this action."}}
```

Format de validation :

```json
{
  "error": {
    "code": "validation_error",
    "message": "The request data is invalid.",
    "details": [
      {"location":["body","starts_at"],"message":"Value error, starts_at must include a timezone","type":"value_error"}
    ]
  }
}
```

Statuts réellement gérés :

- `400`: erreur métier/persistence ou paramètre temporel métier invalide.
- `401`: credentials/tokens invalides; `WWW-Authenticate: Bearer` est ajouté aux erreurs d'auth.
- `403`: User authentifié mais rôle insuffisant, ou User inactif au login.
- `404`: ressource inexistante, tenant inactif/non autorisé ou ressource d'un autre tenant.
- `409`: unicité métier, transition Appointment interdite ou conflit de créneau/concurrence.
- `422`: validation Pydantic/FastAPI des body, path, query ou headers.
- `500`: `internal_server_error`, message générique sans détail SQL/secret.
- `503`: `service_unavailable`, actuellement utilisé par `/ready` si PostgreSQL échoue.

Codes fréquents : `invalid_credentials`, `invalid_access_token`, `invalid_refresh_token`,
`inactive_user`, `insufficient_permissions`, `tenant_not_found`, `location_not_found`,
`employee_not_found`, `service_not_found`, `customer_not_found`, `appointment_not_found`,
`appointment_conflict`, `invalid_appointment_transition` et `validation_error`.

L'OpenAPI généré déclare surtout les succès et `422`; les handlers globaux produisent néanmoins
les autres statuts décrits ici au runtime.

---

# 18. Flux frontend recommandés

## Onboarding provisionné

```text
Platform Admin : POST /platform/tenants
→ POST /platform/tenants/{tenant_id}/invitations
→ envoi du lien par e-mail
→ User : POST /auth/invitations/accept
→ POST /auth/login
→ GET /tenants
→ sélectionner tenant.id
→ POST /tenants/{tenant_id}/locations
```

Il n'existe aucun register public et un User normal ne peut pas provisionner de tenant.

## Connexion

```text
POST /auth/login
→ stocker access_token + refresh_token
→ GET /auth/me
→ GET /tenants
→ choisir tenant.id
→ utiliser X-Tenant-ID sur les modules tenant-scopés
```

## Création d'une structure de réservation

```text
Location
→ Employee lié à location_id
→ Service global ou lié à la Location
→ PUT EmployeeService
→ OpeningHour pour la Location
→ EmployeeAvailability pour l'Employee
```

Sans association EmployeeService active, aucune disponibilité n'est produite pour ce couple.

## Prise de rendez-vous

```text
GET /availability
→ sélectionner employee_id + starts_at
→ POST /appointments avec le même Service/Employee/Location
→ en cas de 409, recharger Availability et faire resélectionner
```

## Refresh token

À l'expiration/proximité d'expiration de l'access token, envoyer le refresh token courant à
`POST /auth/refresh`. Si succès, remplacer immédiatement access et refresh tokens. Sérialiser
les refresh concurrents côté client : réutiliser l'ancien refresh token provoque `401`.
Après `401 invalid_refresh_token`, vider la session et retourner au login.

## Logout

Envoyer le refresh token courant à `POST /auth/logout`. Après `204`, vider les tokens, le tenant
sélectionné, les caches métier et toute donnée privée, même si l'access token n'a pas encore expiré.

---

# 19. Exemple de session API complète

UUID cohérents utilisés : tenant `1111…`, Location `2222…`, Employee `3333…`, Service
`4444…`, Customer `5555…`, Appointment `6666…`.

## Étape 1 : Login Platform Admin

```text
METHOD  POST
URL     /api/v1/auth/login
HEADERS Content-Type: application/x-www-form-urlencoded
BODY    username=platform-admin%40example.test&password=%3Cplatform-password%3E
RÉPONSE IMPORTANTE 200 + access_token plateforme
```

## Étape 2 : Provisioning Tenant

```text
METHOD  POST
URL     /api/v1/platform/tenants
HEADERS Authorization du Platform Admin, Content-Type
BODY    {"name":"Salon Démo","slug":"salon-demo"}
RÉPONSE IMPORTANTE 201 + id = 11111111-1111-4111-8111-111111111111
```

## Étape 3 : Invitation owner

```text
METHOD  POST
URL     /api/v1/platform/tenants/11111111-1111-4111-8111-111111111111/invitations
HEADERS Authorization du Platform Admin, Content-Type
BODY    {"email":"owner@example.test","role":"owner"}
RÉPONSE IMPORTANTE 201 + invitation pending; le lien est envoyé par e-mail
```

## Étape 4 : Acceptation invitation

```text
METHOD  POST
URL     /api/v1/auth/invitations/accept
HEADERS Content-Type: application/json
BODY    {"token":"<invitation_token>","password":"ExamplePassword123!","first_name":"Ada","last_name":"Owner"}
RÉPONSE IMPORTANTE 201 + User et Membership owner créés atomiquement
```

## Étape 5 : Login utilisateur

```text
METHOD  POST
URL     /api/v1/auth/login
HEADERS Content-Type: application/x-www-form-urlencoded
BODY    username=owner%40example.test&password=ExamplePassword123%21
RÉPONSE IMPORTANTE 200 + access_token + refresh_token
```

Définir ensuite `Authorization: Bearer <access_token>`.

`GET /api/v1/tenants` permet de restaurer le tenant associé. Définir
`X-Tenant-ID: 11111111-1111-4111-8111-111111111111` pour les modules suivants.

## Étape 6 : Location

```text
METHOD  POST
URL     /api/v1/tenants/11111111-1111-4111-8111-111111111111/locations
HEADERS Authorization, Content-Type
BODY    {"name":"Bruxelles Centre","slug":"bruxelles-centre","timezone":"Europe/Brussels","country_code":"BE"}
RÉPONSE IMPORTANTE 201 + id = 22222222-2222-4222-8222-222222222222
```

## Étape 7 : Employee

```text
METHOD  POST
URL     /api/v1/employees
HEADERS Authorization, X-Tenant-ID, Content-Type
BODY    {"location_id":"22222222-2222-4222-8222-222222222222","first_name":"Grace","last_name":"Hopper","is_bookable":true}
RÉPONSE IMPORTANTE 201 + id = 33333333-3333-4333-8333-333333333333
```

## Étape 8 : Service

```text
METHOD  POST
URL     /api/v1/services
HEADERS Authorization, X-Tenant-ID, Content-Type
BODY    {"location_id":"22222222-2222-4222-8222-222222222222","name":"Coupe","duration_minutes":30,"buffer_before_minutes":5,"buffer_after_minutes":10,"price_cents":3500,"currency":"EUR"}
RÉPONSE IMPORTANTE 201 + id = 44444444-4444-4444-8444-444444444444
```

## Étape 9 : Association EmployeeService

```text
METHOD  PUT
URL     /api/v1/employees/33333333-3333-4333-8333-333333333333/services/44444444-4444-4444-8444-444444444444
HEADERS Authorization, X-Tenant-ID, Content-Type
BODY    {"custom_duration_minutes":40,"custom_price_cents":3900,"is_active":true}
RÉPONSE IMPORTANTE 200 + association active
```

## Étape 10 : Opening Hours

```text
METHOD  POST
URL     /api/v1/locations/22222222-2222-4222-8222-222222222222/opening-hours
HEADERS Authorization, X-Tenant-ID, Content-Type
BODY    {"weekday":0,"starts_at":"09:00:00","ends_at":"18:00:00"}
RÉPONSE IMPORTANTE 201
```

## Étape 11 : Employee Availability

```text
METHOD  POST
URL     /api/v1/employees/33333333-3333-4333-8333-333333333333/availabilities
HEADERS Authorization, X-Tenant-ID, Content-Type
BODY    {"weekday":0,"starts_at":"09:00:00","ends_at":"17:00:00","valid_from":"2026-08-01","valid_until":null}
RÉPONSE IMPORTANTE 201
```

## Étape 12 : Customer

```text
METHOD  POST
URL     /api/v1/customers
HEADERS Authorization, X-Tenant-ID, Content-Type
BODY    {"first_name":"Marie","last_name":"Client","email":"marie@example.test","phone":"+32123456789","marketing_consent":false}
RÉPONSE IMPORTANTE 201 + id = 55555555-5555-4555-8555-555555555555
```

## Étape 13 : Recherche de créneau

```text
METHOD  GET
URL     /api/v1/availability?location_id=22222222-2222-4222-8222-222222222222&service_id=44444444-4444-4444-8444-444444444444&date=2026-08-17&employee_id=33333333-3333-4333-8333-333333333333
HEADERS Authorization, X-Tenant-ID
BODY    aucun
RÉPONSE IMPORTANTE 200 + sélectionner starts_at = 2026-08-17T09:00:00+02:00
```

## Étape 14 : Appointment

```text
METHOD  POST
URL     /api/v1/appointments
HEADERS Authorization, X-Tenant-ID, Content-Type
BODY    {"location_id":"22222222-2222-4222-8222-222222222222","employee_id":"33333333-3333-4333-8333-333333333333","service_ids":["44444444-4444-4444-8444-444444444444"],"starts_at":"2026-08-17T09:00:00+02:00","customer_id":"55555555-5555-4555-8555-555555555555","notes":"Première visite"}
RÉPONSE IMPORTANTE 201 + id = 66666666-6666-4666-8666-666666666666, status=pending, ends_at calculé
```

## Étape 15 : Confirmation

```text
METHOD  POST
URL     /api/v1/appointments/66666666-6666-4666-8666-666666666666/confirm
HEADERS Authorization, X-Tenant-ID
BODY    aucun
RÉPONSE IMPORTANTE 200 + status=confirmed
```

## Étape 16 : Consultation

```text
METHOD  GET
URL     /api/v1/appointments/66666666-6666-4666-8666-666666666666
HEADERS Authorization, X-Tenant-ID
BODY    aucun
RÉPONSE IMPORTANTE 200 + Customer/Service snapshots
```

## Étape 17 : Completion

```text
METHOD  POST
URL     /api/v1/appointments/66666666-6666-4666-8666-666666666666/complete
HEADERS Authorization, X-Tenant-ID
BODY    aucun
RÉPONSE IMPORTANTE 200 + status=completed
```

Pour annuler à la place, appeler `/cancel` depuis `pending` ou `confirmed` avec une raison optionnelle.

---

# 20. Routes système

## `GET /health`

### Objectif

Confirmer que le processus HTTP répond, sans interroger PostgreSQL.

### Authentification

Public.

### Permissions

Aucune.

### Headers

Aucun.

### Path parameters

Aucun.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `{"status":"ok"}`.

### Erreurs possibles

`500 internal_server_error` seulement en cas d'erreur inattendue d'infrastructure applicative.

### Notes frontend

Destiné surtout au liveness check; ne prouve pas que la base est disponible.

## `GET /ready`

### Objectif

Vérifier que l'application peut exécuter `SELECT 1` sur PostgreSQL.

### Authentification

Public.

### Permissions

Aucune.

### Headers

Aucun.

### Path parameters

Aucun.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: `{"status":"ready"}`.

### Erreurs possibles

`503 service_unavailable`: connexion/requête PostgreSQL impossible.

### Notes frontend

À utiliser comme readiness check; ne remplace pas `/health`.

## `GET /docs`

### Objectif

Afficher Swagger UI généré par FastAPI.

### Authentification

Public.

### Permissions

Aucune.

### Headers

Aucun.

### Path parameters

Aucun.

### Query parameters

Aucun.

### Body

Aucun.

### Réponse succès

`200`: document HTML Swagger UI, pas un DTO JSON.

### Erreurs possibles

Erreurs HTTP génériques uniquement si les assets/la génération OpenAPI échouent.

### Notes frontend

Route interne FastAPI disponible en développement, non comptée parmi les 72 opérations OpenAPI
métier/système. En production, docs, OpenAPI et ReDoc sont désactivés par configuration.

---

## Vérification OpenAPI et décompte

- Nombre total d'opérations réelles dans `app.openapi()` en développement : **72**.
- Nombre total d'opérations OpenAPI documentées, probes incluses : **72**.
- Route interne documentée séparément : `GET /docs`.
- Routes internes signalées mais non détaillées : `/openapi.json`, `/docs/oauth2-redirect`, `/redoc`.

Incohérences observées :

1. `GET /api/v1/availability` retourne réellement un tableau `list[AvailabilitySlotResponse]`.
   Il n'expose pas les champs enveloppe `date`, `timezone`, `slots`; OpenAPI, route, DTO et service
   sont cohérents entre eux sur ce tableau.
2. L'OpenAPI ne déclare pas la plupart des réponses métier `400/401/403/404/409/500/503`, bien
   qu'elles soient réellement produites par les dépendances, services et handlers globaux.
3. Les rôles requis sont appliqués par dépendances mais ne sont pas décrits dans les opérations
   OpenAPI; ils sont explicités dans le présent document.
