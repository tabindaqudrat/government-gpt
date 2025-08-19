'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from 'date-fns';
import { Trash2, FileText, RefreshCw } from 'lucide-react';

type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface DocumentUpload {
  id: string;
  status: UploadStatus;
  originalFileName: string;
  fileSize: number;
  uploadProgress: number;
  processingProgress: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Document {
  id: string;
  title: string;
  type: string;
  originalFileName: string;
  createdAt: string;
  updatedAt: string;
  embeddingCount: number;
}

export default function DashboardPage() {
  const [uploads, setUploads] = useState<DocumentUpload[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'uploads' | 'documents'>('uploads');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const checkPassword = async (inputPassword: string) => {
    try {
      const response = await fetch('/api/admin/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: inputPassword }),
      });
      
      if (response.ok) {
        setIsAuthorized(true);
        sessionStorage.setItem('adminAuthorized', 'true');
        fetchUploads();
        fetchDocuments();
      } else {
        setError('Invalid password');
      }
    } catch (error) {
      setError('Something went wrong');
    }
  };

  const fetchUploads = async () => {
    try {
      const response = await fetch('/api/admin/uploads');
      const data = await response.json();
      setUploads(data);
    } catch (error) {
      console.error('Failed to fetch uploads:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/admin/documents');
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This will also remove all associated embeddings from the knowledge base.')) {
      return;
    }

    setIsDeleting(documentId);
    try {
      const response = await fetch(`/api/admin/documents/${documentId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh the documents list
        fetchDocuments();
        alert(data.message);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      alert('Failed to delete document');
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem('adminAuthorized') === 'true') {
      setIsAuthorized(true);
      fetchUploads();
      fetchDocuments();
    }
  }, []);

  if (!isAuthorized) {
    return (
      <div className="container max-w-md py-8">
        <h1 className="mb-8 text-2xl font-bold">Admin Access</h1>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            />
          </div>
          <Button onClick={() => checkPassword(password)}>Submit</Button>
          {error && <p className="text-red-500">{error}</p>}
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: UploadStatus) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      completed: 'success',
      failed: 'destructive',
    };

    return (
      <Badge variant={variants[status] as any}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeLabels = {
      policies: 'Policies',
      services: 'Services',
      // Legacy types (for existing data)
      rules_policy: 'Rules & Policy',
      citizen_services: 'Citizen Services',
      amendment: 'Amendment',
      executive_handbook: 'Executive Handbook',
      rules_of_business: 'Rules of Business',
      estacode: 'Estacode',
      service_catalog: 'Service Catalog',
      constitution: 'Constitution',
      election_law: 'Election Law',
      parliamentary_bulletin: 'Parliamentary Bulletin',
      bill: 'Bill',
    };

    return (
      <Badge variant="outline">
        {typeLabels[type as keyof typeof typeLabels] || type}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              fetchUploads();
              fetchDocuments();
            }}
            variant="outline"
          >
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex space-x-1 border-b">
        <button
          onClick={() => setActiveTab('uploads')}
          className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
            activeTab === 'uploads'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="mr-2 inline size-4" />
          Upload Status ({uploads.length})
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
            activeTab === 'documents'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="mr-2 inline size-4" />
          Knowledge Base ({documents.length})
        </button>
      </div>

      {/* Upload Status Tab */}
      {activeTab === 'uploads' && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Upload Progress</TableHead>
                <TableHead>Processing Progress</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.map((upload) => (
                <TableRow key={upload.id}>
                  <TableCell className="font-medium">{upload.originalFileName}</TableCell>
                  <TableCell>{getStatusBadge(upload.status)}</TableCell>
                  <TableCell>{formatFileSize(upload.fileSize)}</TableCell>
                  <TableCell>
                    <Progress value={upload.uploadProgress} className="w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Progress value={upload.processingProgress} className="w-[100px]" />
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(upload.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-red-500">
                    {upload.error || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Knowledge Base Tab */}
      {activeTab === 'documents' && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Embeddings</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((document) => (
                <TableRow key={document.id}>
                  <TableCell className="font-medium">{document.title}</TableCell>
                  <TableCell>{getTypeBadge(document.type)}</TableCell>
                  <TableCell className="text-sm text-gray-600">{document.originalFileName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{document.embeddingCount} chunks</Badge>
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <Button
                      onClick={() => deleteDocument(document.id)}
                      variant="destructive"
                      size="sm"
                      disabled={isDeleting === document.id}
                    >
                      {isDeleting === document.id ? (
                        <RefreshCw className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
} 