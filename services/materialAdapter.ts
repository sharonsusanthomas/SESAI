import { LearningMaterial } from '../types';

/**
 * Adapter to transform backend material response to frontend type
 * Backend uses: filename, file_type, created_at
 * Frontend expects: title, type, processedDate
 */
export const adaptMaterialFromBackend = (backendMaterial: any): LearningMaterial => {
    return {
        id: backendMaterial.id,
        title: backendMaterial.filename || 'Untitled',
        type: mapFileType(backendMaterial.file_type),
        content: '', // Content loaded on-demand
        summary: backendMaterial.summary || '',
        processedDate: backendMaterial.created_at || new Date().toISOString(),
        tags: [],
        // Store backend-specific fields for reference
        filename: backendMaterial.filename,
        file_type: backendMaterial.file_type,
        created_at: backendMaterial.created_at,
        drive_file_id: backendMaterial.drive_file_id,
        drive_link: backendMaterial.drive_link
    };
};

/**
 * Map backend file_type to frontend type
 */
const mapFileType = (fileType: string): 'text' | 'image' | 'pdf' | 'audio' => {
    switch (fileType?.toLowerCase()) {
        case 'pdf':
            return 'pdf';
        case 'image':
        case 'jpg':
        case 'jpeg':
        case 'png':
            return 'image';
        case 'audio':
        case 'mp3':
        case 'wav':
            return 'audio';
        case 'text':
        case 'txt':
        case 'md':
        default:
            return 'text';
    }
};

/**
 * Adapt list of materials from backend
 */
export const adaptMaterialsFromBackend = (backendResponse: any): LearningMaterial[] => {
    if (!backendResponse || !backendResponse.materials) {
        return [];
    }

    return backendResponse.materials.map(adaptMaterialFromBackend);
};
