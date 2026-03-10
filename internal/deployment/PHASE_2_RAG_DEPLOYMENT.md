# 🚀 Phase 2 Deployment Guide - RAG Engine + Frontend Integration

**Date**: 2026-03-10  
**Status**: Ready for Deployment  
**Components**: RAG Engine, Semantic Search, AI Chat, Frontend Services

---

## 📋 **Overview - What's New in Phase 2**

### **Backend Enhancements**
- ✅ **RAG Engine** - Document processing with Vertex AI embeddings
- ✅ **PDF Processing** - PyPDF2 for text extraction
- ✅ **Semantic Search** - pgvector for similarity search
- ✅ **AI Chat** - Gemini Pro with RAG context
- ✅ **Auto-processing** - Documents automatically embedded after upload

### **Frontend Integration**
- ✅ **Auth Service** - Complete authentication flow
- ✅ **Course Service** - Course management UI integration
- ✅ **RAG Service** - Chat and semantic search
- ✅ **TypeScript** - Type-safe API clients

---

## 🔧 **Setup Instructions**

### **1. Backend Dependencies**

```bash
cd backend

# Install new dependencies
pip install -r requirements.txt

# New packages added:
# - PyPDF2>=3.0.0 (PDF processing)
# - vertexai>=1.38.0 (Vertex AI embeddings)
```

### **2. Environment Variables**

Update `.env` with RAG configuration:

```env
# Existing variables
GCP_PROJECT_ID=novatotorai-489214
GCP_LOCATION=us-central1
DATABASE_URL=postgresql://...
GCS_BUCKET_NAME=novatutor-documents-novatotorai-489214

# New for Phase 2
VERTEX_AI_LOCATION=us-central1
EMBEDDING_MODEL=textembedding-gecko@003
GEMINI_MODEL=gemini-1.5-pro
RAG_CHUNK_SIZE=500
RAG_CHUNK_OVERLAP=50
RAG_TOP_K=5
```

### **3. Database - Verify pgvector Extension**

```sql
-- Connect to Cloud SQL
gcloud sql connect novatutor-db --user=postgres

-- Verify pgvector is installed
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- Should return: vector | 0.5.0 (or similar)

-- Check embeddings table
\d document_embeddings

-- Verify vector column type
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'document_embeddings' 
  AND column_name = 'embedding';
```

### **4. Enable Vertex AI APIs**

```bash
gcloud services enable \
  aiplatform.googleapis.com \
  generativelanguage.googleapis.com \
  --project=novatotorai-489214
```

### **5. Grant IAM Permissions**

```bash
PROJECT_ID="novatotorai-489214"
SA="novatutor-backend@$PROJECT_ID.iam.gserviceaccount.com"

# Grant Vertex AI access
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA" \
  --role="roles/aiplatform.user"

# Verify
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:$SA"
```

---

## 🧪 **Testing RAG Engine**

### **Test 1: Health Check**

```powershell
$BACKEND_URL = "https://novatutor-backend-366729322781.us-central1.run.app"

Invoke-RestMethod -Uri "$BACKEND_URL/api/v1/rag/health"
```

Expected output:
```json
{
  "status": "healthy",
  "engine": "production_rag_engine",
  "embedding_model": "textembedding-gecko@003"
}
```

### **Test 2: Upload & Process Document**

```powershell
# 1. Login as teacher
$token = "YOUR_TEACHER_TOKEN"
$teacherId = "YOUR_TEACHER_ID"
$courseId = "YOUR_COURSE_ID"

# 2. Upload PDF document
$pdfPath = "C:\path\to\document.pdf"
$formData = @{
  file = Get-Item $pdfPath
}

$uploadRes = Invoke-RestMethod `
  -Method Post `
  -Uri "$BACKEND_URL/api/v1/courses/$courseId/upload-document?teacher_id=$teacherId" `
  -Headers @{ Authorization = "Bearer $token" } `
  -Form $formData

$uploadRes | ConvertTo-Json
```

Expected output:
```json
{
  "message": "Document uploaded successfully",
  "document": {
    "id": "1773123456.789",
    "course_id": "...",
    "document_url": "https://storage.googleapis.com/...",
    "document_name": "document.pdf"
  },
  "rag_status": "Processed 25 chunks"
}
```

### **Test 3: Semantic Search**

```powershell
$searchBody = @{
  query = "What is the Pythagorean theorem?"
  course_id = $courseId
  top_k = 3
} | ConvertTo-Json

$searchRes = Invoke-RestMethod `
  -Method Post `
  -Uri "$BACKEND_URL/api/v1/rag/search" `
  -Headers @{ 
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
  } `
  -Body $searchBody

$searchRes.results | ConvertTo-Json -Depth 3
```

### **Test 4: AI Chat with RAG Context**

```powershell
$chatBody = @{
  message = "Explain the Pythagorean theorem with an example"
  course_id = $courseId
  conversation_history = @()
} | ConvertTo-Json

$chatRes = Invoke-RestMethod `
  -Method Post `
  -Uri "$BACKEND_URL/api/v1/rag/chat" `
  -Headers @{ 
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
  } `
  -Body $chatBody

Write-Host "AI Response:" -ForegroundColor Cyan
Write-Host $chatRes.response

Write-Host "`nSources:" -ForegroundColor Yellow
$chatRes.sources | ForEach-Object {
  Write-Host "  - $($_.document_name) (Score: $($_.similarity_score))"
}
```

---

## 🚀 **Deploy Phase 2**

### **1. Build & Push Backend**

```powershell
cd C:\Users\HIEU\PycharmProjects\NovaTutor_AI

$PROJECT_ID = "novatotorai-489214"
$REGION = "us-central1"
$SERVICE = "novatutor-backend"
$IMAGE = "gcr.io/{0}/{1}:phase2" -f $PROJECT_ID, $SERVICE
$CONN = "{0}:{1}:{2}" -f $PROJECT_ID, $REGION, "novatutor-db"

# Build with RAG dependencies
docker build -t $IMAGE -f backend/Dockerfile backend
docker push $IMAGE

# Deploy to Cloud Run
gcloud run deploy $SERVICE `
  --image=$IMAGE `
  --platform=managed `
  --region=$REGION `
  --allow-unauthenticated `
  --service-account="novatutor-backend@$PROJECT_ID.iam.gserviceaccount.com" `
  --add-cloudsql-instances=$CONN `
  --memory=2Gi `
  --timeout=300s
```

**Note**: Increased memory to 2Gi and timeout to 300s for RAG processing.

### **2. Verify Deployment**

```powershell
# Check health
Invoke-RestMethod -Uri "$BACKEND_URL/api/v1/health"
Invoke-RestMethod -Uri "$BACKEND_URL/api/v1/rag/health"

# Check logs
gcloud run services logs read novatutor-backend --region=us-central1 --limit=100
```

### **3. Frontend Deployment**

```powershell
cd frontend

# Update .env.local
@"
NEXT_PUBLIC_API_URL=https://novatutor-backend-366729322781.us-central1.run.app/api/v1
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=YOUR_CLIENT_ID
"@ | Out-File -FilePath .env.local -Encoding UTF8

# Build frontend
npm install
npm run build

# Deploy to Cloud Run
$FRONTEND_IMAGE = "gcr.io/$PROJECT_ID/novatutor-frontend:phase2"
docker build -t $FRONTEND_IMAGE -f Dockerfile .
docker push $FRONTEND_IMAGE

gcloud run deploy novatutor-frontend `
  --image=$FRONTEND_IMAGE `
  --platform=managed `
  --region=$REGION `
  --allow-unauthenticated
```

---

## 📊 **New API Endpoints**

### **RAG & Chat Endpoints**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/rag/process-document` | POST | Process uploaded document |
| `/api/v1/rag/search` | POST | Semantic search |
| `/api/v1/rag/chat` | POST | AI chat with RAG context |
| `/api/v1/rag/health` | GET | RAG engine health check |

### **Updated Course Endpoints**

| Endpoint | Changes |
|----------|---------|
| `/api/v1/courses/{id}/upload-document` | Now triggers RAG processing automatically |

---

## 🎯 **Feature Checklist**

### **Backend**
- [x] RAG engine with Vertex AI embeddings
- [x] PDF text extraction with PyPDF2
- [x] Document chunking with overlap
- [x] Vector storage with pgvector
- [x] Semantic search API
- [x] AI chat with Gemini Pro
- [x] Auto-processing after upload
- [x] Source citation in responses

### **Frontend**
- [x] Auth service with token management
- [x] Course service with CRUD operations
- [x] RAG service for chat & search
- [x] TypeScript type definitions
- [ ] Chat UI component (next step)
- [ ] Document viewer (next step)
- [ ] Progress tracking UI (next step)

---

## 🔍 **Monitoring & Debugging**

### **Check RAG Processing Status**

```sql
-- Connect to Cloud SQL
gcloud sql connect novatutor-db --user=postgres

-- Count embeddings per course
SELECT 
  cd.course_id,
  c.name as course_name,
  COUNT(de.id) as embedding_count,
  COUNT(DISTINCT de.document_id) as document_count
FROM document_embeddings de
JOIN course_documents cd ON de.document_id = cd.id
JOIN courses c ON cd.course_id = c.id
GROUP BY cd.course_id, c.name;

-- View recent embeddings
SELECT 
  de.id,
  cd.document_name,
  de.chunk_index,
  LEFT(de.chunk_text, 100) as chunk_preview
FROM document_embeddings de
JOIN course_documents cd ON de.document_id = cd.id
ORDER BY de.id DESC
LIMIT 10;
```

### **Check Vertex AI Usage**

```bash
# View AI Platform logs
gcloud logging read "resource.type=aiplatform.googleapis.com/Endpoint" \
  --project=novatotorai-489214 \
  --limit=50 \
  --format=json

# Monitor embedding generation
gcloud logging read "textPayload=~'embedding'" \
  --project=novatotorai-489214 \
  --limit=20
```

---

## 💡 **Performance Optimization**

### **Embedding Generation**
- Batch size: 5 texts per request (Vertex AI limit)
- Average time: ~2-3 seconds per batch
- Total time for 100 chunks: ~60 seconds

### **Semantic Search**
- pgvector cosine distance: <50ms
- Top-5 results: <100ms total
- Index on `embedding` column recommended for >10K vectors

### **Chat Response**
- RAG retrieval: ~100ms
- Gemini Pro generation: ~2-3 seconds
- Total response time: ~3 seconds

---

## 🛡️ **Security Considerations**

### **API Access**
- All RAG endpoints require authentication
- Document processing restricted to course teachers
- Search/chat available to enrolled students only

### **Data Privacy**
- Embeddings stored in private Cloud SQL
- Documents in private Cloud Storage buckets
- No data sent to external services except Vertex AI

### **Rate Limiting**
- Current: Applied via middleware
- Recommended production: 100 requests/minute per user
- Embeddings: Max 300 texts/minute per project (Vertex AI quota)

---

## 📝 **Cost Estimates (Phase 2)**

| Service | Usage (monthly) | Cost Estimate |
|---------|-----------------|---------------|
| Vertex AI Embeddings | 100K texts | $10-15 |
| Gemini Pro API | 10K requests | $20-30 |
| Cloud SQL (upgraded) | 2GB storage | $25-30 |
| Cloud Storage | 50GB | $1-2 |
| Cloud Run (increased memory) | 2Gi, 1M requests | $15-25 |
| **Total Phase 2** | | **~$70-100/month** |

**Previous (Phase 1)**: $25-35/month  
**Increase**: +$45-65/month for AI features

---

## 🎉 **Next Steps - Phase 3**

1. **Chat UI Components**
   - Real-time chat interface
   - Message history
   - Source citations display
   - Typing indicators

2. **Document Viewer**
   - PDF preview in browser
   - Highlight relevant passages
   - Inline annotations

3. **Progress Analytics**
   - Student learning path
   - Topic mastery tracking
   - Performance dashboards

4. **3D Avatar Integration**
   - Emotion-aware responses
   - Voice synthesis
   - Real-time animation

---

## 📞 **Troubleshooting**

### **Error: "Failed to generate embeddings"**
- Check Vertex AI API is enabled
- Verify service account has `roles/aiplatform.user`
- Check quota limits in GCP Console

### **Error: "Vector dimension mismatch"**
- Embedding model changed? Run migration:
  ```sql
  -- Drop and recreate embeddings table
  TRUNCATE TABLE document_embeddings;
  ```

### **Slow search performance**
- Create vector index:
  ```sql
  CREATE INDEX embedding_idx ON document_embeddings 
  USING ivfflat (embedding vector_cosine_ops);
  ```

---

**✅ Phase 2 Complete - RAG Engine Operational!**

Ready to process documents, generate embeddings, and power intelligent conversations! 🚀

