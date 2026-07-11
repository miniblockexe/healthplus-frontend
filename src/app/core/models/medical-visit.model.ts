export interface MedicalAttachment {
  id: number;
  visitId: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface MedicalVisit {
  id: number;
  userId: number;
  hospitalName: string;
  doctorName?: string;
  specialty?: string;
  diagnosis?: string;
  treatment?: string;
  visitDate: string;
  followUpDate?: string;
  attachments: MedicalAttachment[];
  createdAt: string;
}
