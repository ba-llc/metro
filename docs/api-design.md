# API Design

REST route handlers under `src/app/api`. Every endpoint:

1. Resolves the session and active organization (`requireOrg()`), returning 401/403
   otherwise.
2. Validates params/body with Zod (schemas shared with client forms).
3. Delegates to a service in `src/server/services` — no business logic in handlers.

## Response Envelope

```json
// success
{ "data": { ... } }

// failure
{ "error": { "code": "NOT_FOUND", "message": "Property not found" } }
```

Error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `CONFLICT`,
`INTERNAL`.

## Endpoints

### Auth

```
POST /api/auth/[...nextauth]      NextAuth (credentials)
POST /api/auth/register           Create user + organization (bootstrap signup)
```

### Properties

```
GET    /api/properties                       List (filter: type, status, q)
POST   /api/properties                       Create (with address)
GET    /api/properties/:id                   Full record (spaces, tenants, contacts, photos counts)
PATCH  /api/properties/:id                   Update
DELETE /api/properties/:id                   Soft delete
GET    /api/properties/:id/activity          Activity log
```

### Spaces

```
GET    /api/properties/:id/spaces
POST   /api/properties/:id/spaces
PATCH  /api/spaces/:id
DELETE /api/spaces/:id
```

### Tenants & Occupancy

```
GET    /api/tenants                          Org-level tenant directory
POST   /api/tenants
PATCH  /api/tenants/:id
GET    /api/properties/:id/tenants           Occupancies for a property
POST   /api/properties/:id/tenants           Add occupancy { tenantId, suiteNumber, ... }
DELETE /api/occupancies/:id
```

### Contacts

```
GET    /api/contacts
POST   /api/contacts
PATCH  /api/contacts/:id
POST   /api/properties/:id/contacts          Assign { contactId }
DELETE /api/properties/:id/contacts/:contactId
```

### Assets & Photos

```
POST   /api/assets/upload                    Upload (multipart) -> Asset record
GET    /api/assets/:id/content               Stream/redirect to file content
GET    /api/properties/:id/photos
POST   /api/properties/:id/photos            { assetId, category, caption }
DELETE /api/photos/:id
```

In production with S3, `POST /api/assets/presign` issues presigned PUT URLs and the
client uploads directly; the local-disk dev provider accepts multipart uploads through
the same `Asset` contract.

### Site Plans

```
POST   /api/properties/:id/site-plans        Upload original PDF (immutable)
GET    /api/site-plans/:id                   Plan + pages + layers + annotations
PATCH  /api/site-plans/:id                   Rename / status
DELETE /api/site-plans/:id
POST   /api/site-plans/:id/pages             Register rasterized page { pageNumber, assetId, width, height }
PUT    /api/site-plan-pages/:pageId/annotations   Batch save { layers: [...], annotations: [...] }
POST   /api/site-plans/:id/snapshots         Create version snapshot
GET    /api/site-plans/:id/snapshots         List snapshots
POST   /api/site-plans/:id/snapshots/:snapshotId/restore
```

PDF→raster conversion runs client-side with pdf.js: the browser renders each page to
PNG and registers pages via `POST .../pages`. The original PDF is stored untouched.

### Maps

```
GET    /api/properties/:id/maps
POST   /api/properties/:id/maps              { kind, params } -> creates Job -> MapAsset
DELETE /api/maps/:id
POST   /api/properties/:id/geocode           Geocode address -> lat/lng on Property
```

### Demographics

```
GET    /api/properties/:id/demographics
POST   /api/properties/:id/demographics/fetch  { geographyType, geographyParams }
```

### Marketing

```
GET    /api/templates                        System + org templates (filter: channel)
POST   /api/templates
PATCH  /api/templates/:id
GET    /api/properties/:id/documents
POST   /api/properties/:id/documents         { templateId } -> render job -> GeneratedDocument
GET    /api/documents/:id                    Status + download asset id when READY
DELETE /api/documents/:id
```

### Jobs

```
GET    /api/jobs/:id                         Poll job status
```

## Long-Running Operations

Map generation and document rendering return immediately with the created record
(`status: QUEUED`); the client polls the record (React Query `refetchInterval`) until
`READY | FAILED`.

## Authorization Matrix

| Action | OWNER | ADMIN | BROKER | COORDINATOR | VIEWER |
|---|---|---|---|---|---|
| Manage org / members / templates | x | x | | | |
| Create/edit properties & children | x | x | x | x | |
| Generate documents & maps | x | x | x | x | |
| View everything | x | x | x | x | x |
