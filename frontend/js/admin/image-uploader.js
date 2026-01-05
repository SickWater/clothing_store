// admin/image-uploader.js - Image Upload Utility
class ImageUploader {
    constructor(options = {}) {
      this.options = {
        maxFiles: 10,
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        previewContainer: null,
        uploadArea: null,
        onFilesChange: null,
        ...options
      };
      
      this.files = [];
      this.mainImageIndex = 0;
      this.existingImages = [];
      this.init();
    }
    
    init() {
      this.setupUploadArea();
      this.setupFileInput();
    }
    
    setupUploadArea() {
      const { uploadArea } = this.options;
      if (!uploadArea) return;
      
      // Click to upload
      uploadArea.addEventListener('click', () => {
        this.fileInput.click();
      });
      
      // Drag and drop
      uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
      });
      
      uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
      });
      
      uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files);
        this.handleFiles(files);
      });
    }
    
    setupFileInput() {
      const { uploadArea } = this.options;
      if (!uploadArea) return;
      
      this.fileInput = document.createElement('input');
      this.fileInput.type = 'file';
      this.fileInput.multiple = true;
      this.fileInput.accept = 'image/*';
      this.fileInput.style.display = 'none';
      
      document.body.appendChild(this.fileInput);
      
      this.fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        this.handleFiles(files);
        this.fileInput.value = ''; // Reset input
      });
    }
    
    handleFiles(newFiles) {
      // Validate files
      const validFiles = newFiles.filter(file => {
        // Check file type
        if (!this.options.allowedTypes.includes(file.type)) {
          this.showError(`File "${file.name}" is not a supported image type.`);
          return false;
        }
        
        // Check file size
        if (file.size > this.options.maxSize) {
          this.showError(`File "${file.name}" exceeds 5MB limit.`);
          return false;
        }
        
        // Check total files limit
        if (this.files.length >= this.options.maxFiles) {
          this.showError(`Maximum ${this.options.maxFiles} images allowed.`);
          return false;
        }
        
        return true;
      });
      
      // Add to files array
      this.files = [...this.files, ...validFiles];
      
      // Update previews
      this.updatePreviews();
      
      // Callback
      if (this.options.onFilesChange) {
        this.options.onFilesChange(this.files);
      }
    }
    
    updatePreviews() {
      const { previewContainer } = this.options;
      if (!previewContainer) return;
      
      // Clear existing previews (except template)
      const previews = previewContainer.querySelectorAll('.preview-item:not(.template)');
      previews.forEach(preview => preview.remove());
      
      // Hide no-images message if we have files
      const noImagesMsg = previewContainer.querySelector('.no-images');
      if (noImagesMsg) {
        noImagesMsg.style.display = this.files.length === 0 ? 'block' : 'none';
      }
      
      // Create preview for each file
      this.files.forEach((file, index) => {
        const preview = this.createPreview(file, index);
        previewContainer.appendChild(preview);
      });
    }
    
    createPreview(file, index) {
      const template = document.querySelector('.preview-item.template');
      if (!template) return null;
      
      const preview = template.cloneNode(true);
      preview.classList.remove('template');
      preview.style.display = 'block';
      
      if (index === this.mainImageIndex) {
        preview.classList.add('main');
      }
      
      // Set image preview
      const img = preview.querySelector('img');
      const reader = new FileReader();
      
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
      
      // Set file info
      const nameSpan = preview.querySelector('.preview-name');
      const sizeSpan = preview.querySelector('.preview-size');
      
      nameSpan.textContent = file.name;
      sizeSpan.textContent = this.formatFileSize(file.size);
      
      // Set as main button
      const setMainBtn = preview.querySelector('.set-main');
      setMainBtn.addEventListener('click', () => {
        this.setMainImage(index);
      });
      
      // Remove button
      const removeBtn = preview.querySelector('.remove-image');
      removeBtn.addEventListener('click', () => {
        this.removeImage(index);
      });
      
      return preview;
    }
    
    setMainImage(index) {
      this.mainImageIndex = index;
      
      // Update UI
      const previews = this.options.previewContainer.querySelectorAll('.preview-item:not(.template)');
      previews.forEach((preview, i) => {
        if (i === index) {
          preview.classList.add('main');
        } else {
          preview.classList.remove('main');
        }
      });
    }
    
    removeImage(index) {
      // Remove file from array
      this.files.splice(index, 1);
      
      // Adjust main image index if needed
      if (index === this.mainImageIndex) {
        this.mainImageIndex = 0;
      } else if (index < this.mainImageIndex) {
        this.mainImageIndex--;
      }
      
      // Update previews
      this.updatePreviews();
      
      // Callback
      if (this.options.onFilesChange) {
        this.options.onFilesChange(this.files);
      }
    }
    
    addExistingImages(images) {
      this.existingImages = images;
      this.updateExistingImagesUI();
    }
    
    updateExistingImagesUI() {
      const container = document.getElementById('existingImagesGrid');
      if (!container) return;
      
      container.innerHTML = '';
      
      this.existingImages.forEach((image, index) => {
        const div = document.createElement('div');
        div.className = 'existing-image';
        
        div.innerHTML = `
          <img src="${image.startsWith('http') ? image : `${API_BASE}${image}`}" 
               alt="Existing image" 
               onerror="this.src='https://via.placeholder.com/100x80?text=Image'">
          <button type="button" class="remove-existing" data-index="${index}">×</button>
        `;
        
        // Remove button event
        const removeBtn = div.querySelector('.remove-existing');
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeExistingImage(index);
        });
        
        container.appendChild(div);
      });
      
      // Show/hide existing images section
      const existingSection = document.getElementById('existingImages');
      if (existingSection) {
        existingSection.style.display = this.existingImages.length > 0 ? 'block' : 'none';
      }
    }
    
    removeExistingImage(index) {
      this.existingImages.splice(index, 1);
      this.updateExistingImagesUI();
    }
    
    getAllImages() {
      return {
        files: this.files,
        mainImageIndex: this.mainImageIndex,
        existingImages: this.existingImages
      };
    }
    
    getFormData() {
      const formData = new FormData();
      
      // Add new files
      this.files.forEach((file, index) => {
        if (index === this.mainImageIndex) {
          formData.append('image', file); // Main image
        } else {
          formData.append('images', file); // Additional images
        }
      });
      
      // Add existing images as URLs (for edit mode)
      if (this.existingImages.length > 0) {
        formData.append('existingImages', JSON.stringify(this.existingImages));
      }
      
      return formData;
    }
    
    clear() {
      this.files = [];
      this.mainImageIndex = 0;
      this.existingImages = [];
      this.updatePreviews();
      this.updateExistingImagesUI();
      
      // Callback
      if (this.options.onFilesChange) {
        this.options.onFilesChange(this.files);
      }
    }
    
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    showError(message) {
      // Create toast notification
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #e53935;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideUp 0.3s ease;
      `;
      toast.textContent = message;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(100px)';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
  }
  
  // Add animation style if not present
  if (!document.querySelector('#toast-animation')) {
    const style = document.createElement('style');
    style.id = 'toast-animation';
    style.textContent = `
      @keyframes slideUp {
        from { transform: translateY(100px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  export default ImageUploader;