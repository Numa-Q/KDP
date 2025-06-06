// scripts.js - Gestion du livre pour KDP Creator

document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('📖 Initializing KDP Creator...');

    // Références DOM
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const dropZone = document.getElementById('drop-zone');
    const imageUpload = document.getElementById('image-upload');
    const previewZone = document.getElementById('preview-zone');
    const pageCarousel = document.getElementById('page-carousel');
    const pageTemplate = document.getElementById('page-template');
    const promptField = document.getElementById('prompt-field');
    const imagePrompt = document.getElementById('image-prompt');
    const addPageButton = document.getElementById('add-page');
    const clearPreviewButton = document.getElementById('clear-preview');
    const modal = document.getElementById('modal');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirm = document.getElementById('modal-confirm');
    const modalClose = document.getElementById('modal-close');
    const toast = document.getElementById('toast');
    const saveProjectButton = document.getElementById('save-project');
    const loadProjectButton = document.getElementById('load-project');
    const loadFileInput = document.getElementById('load-file');
    const exportPDFButton = document.getElementById('export-pdf');
    const clearProjectButton = document.getElementById('clear-project');
    const bookTitleInput = document.getElementById('book-title');
    const fileNameInput = document.getElementById('file-name');
    const pageSizeSelect = document.getElementById('page-size');
    const bgColorInput = document.getElementById('bg-color');
    const fontSelect = document.getElementById('font');
    const fontSizeInput = document.getElementById('font-size');
    const textColorInput = document.getElementById('text-color');

    // Vérifications DOM
    const requiredElements = {
      themeToggle,
      body,
      dropZone,
      imageUpload,
      previewZone,
      pageCarousel,
      pageTemplate,
      promptField,
      imagePrompt,
      addPageButton,
      clearPreviewButton,
      modal,
      modalMessage,
      modalConfirm,
      modalClose,
      toast,
      saveProjectButton,
      loadProjectButton,
      loadFileInput,
      exportPDFButton,
      clearProjectButton,
      bookTitleInput,
      fileNameInput,
      pageSizeSelect,
      bgColorInput,
      fontSelect,
      fontSizeInput,
      textColorInput,
    };
    for (const [key, element] of Object.entries(requiredElements)) {
      if (!element) {
        console.error(`Error: ${key} element not found`);
        showToast('error', `Erreur : élément ${key} introuvable.`);
        return;
      }
    }

    let pages = [];
    let currentImage = null;
    let dragIndex = null;
    let toastQueue = []; // File d'attente pour les toasts
    let isToastActive = false;

    // Mode sombre/clair
    let savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
      savedTheme = 'dark'; // Forcer le mode sombre par défaut
      localStorage.setItem('theme', savedTheme);
    }
    console.log('Initial theme:', savedTheme);
    body.setAttribute('data-theme', savedTheme);
    themeToggle.checked = savedTheme === 'light';
    body.classList.remove('initial-dark');

    themeToggle.addEventListener('change', () => {
      try {
        const newTheme = themeToggle.checked ? 'light' : 'dark';
        console.log('Theme change triggered:', newTheme);
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        showToast('success', `Mode ${newTheme === 'light' ? 'clair' : 'sombre'} activé`);
      } catch (error) {
        console.error('Theme change error:', error);
        showToast('error', 'Erreur lors du changement de thème.');
      }
    });

    // Validation du contraste WCAG
    function calculateContrast(bgColor, textColor) {
      const hexToLuminance = (hex) => {
        const rgb = hex.replace('#', '');
        const r = parseInt(rgb.substr(0, 2), 16) / 255;
        const g = parseInt(rgb.substr(2, 2), 16) / 255;
        const b = parseInt(rgb.substr(4, 2), 16) / 255;
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const l1 = hexToLuminance(bgColor);
      const l2 = hexToLuminance(textColor);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      return ratio >= 4.5;
    }

    bgColorInput.addEventListener('change', () => {
      if (!calculateContrast(bgColorInput.value, textColorInput.value)) {
        showToast('warning', 'Contraste fond/texte trop faible (WCAG).');
      }
    });

    textColorInput.addEventListener('change', () => {
      if (!calculateContrast(bgColorInput.value, textColorInput.value)) {
        showToast('warning', 'Contraste fond/texte trop faible (WCAG).');
      }
    });

    // Persistance configuration
    function saveConfig() {
      const config = {
        title: bookTitleInput.value,
        fileName: fileNameInput.value,
        pageSize: pageSizeSelect.value,
        bgColor: bgColorInput.value,
        font: fontSelect.value,
        fontSize: fontSizeInput.value,
        textColor: textColorInput.value,
      };
      localStorage.setItem('lastConfig', JSON.stringify(config));
      console.log('Configuration saved:', config);
    }

    function loadConfig() {
      const savedConfig = localStorage.getItem('lastConfig');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        bookTitleInput.value = config.title || '';
        fileNameInput.value = config.fileName || '';
        pageSizeSelect.value = config.pageSize || 'a4';
        bgColorInput.value = config.bgColor || '#FFFFFF';
        fontSelect.value = config.font || 'Arial';
        fontSizeInput.value = config.fontSize || '12';
        textColorInput.value = config.textColor || '#000000';
        console.log('Configuration loaded:', config);
      }
    }

    loadConfig();
    [bookTitleInput, fileNameInput, pageSizeSelect, bgColorInput, fontSelect, fontSizeInput, textColorInput].forEach(
      (input) => {
        input.addEventListener('change', saveConfig);
      }
    );

    // Validation configuration
    function validateConfig() {
      if (!bookTitleInput.value.trim()) {
        showToast('error', 'Le titre du livre est obligatoire.');
        return false;
      }
      if (!fileNameInput.value.match(/^[a-zA-Z0-9_-]+$/)) {
        showToast('error', 'Nom de fichier invalide (lettres, chiffres, tirets, underscores).');
        return false;
      }
      const fontSize = parseInt(fontSizeInput.value);
      if (fontSize < 8 || fontSize > 24) {
        showToast('error', 'La taille de police doit être entre 8 et 24.');
        return false;
      }
      return true;
    }

    // Gestion du template
    pageTemplate.addEventListener('change', () => {
      promptField.style.display = pageTemplate.value === 'full-page' ? 'none' : 'block';
      console.log('Template changed:', pageTemplate.value);
    });

    // Glisser-déposer
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
      console.log('Dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
      console.log('Dragleave');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        console.log('Image dropped:', files[0].name);
        handleImage(files[0]);
      }
    });

    // Sélection d'image
    imageUpload.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        console.log('Image selected:', e.target.files[0].name);
        handleImage(e.target.files[0]);
      }
    });

    // Ajouter page
    addPageButton.addEventListener('click', () => {
      if (!currentImage) {
        showToast('error', 'Veuillez sélectionner une image.');
        return;
      }
      const template = pageTemplate.value;
      const prompt = template === 'full-page' ? '' : imagePrompt.value;
      pages.push({ image: currentImage, template, prompt });
      updateCarousel();
      clearPreview();
      imagePrompt.value = '';
      showToast('success', 'Page ajoutée !');
      console.log('Page added:', { template, prompt });
    });

    // Vider la prévisualisation
    clearPreviewButton.addEventListener('click', () => {
      clearPreview();
      imagePrompt.value = '';
      pageTemplate.value = 'full-page';
      promptField.style.display = 'none';
      showToast('info', 'Prévisualisation annulée');
      console.log('Preview cleared');
    });

    // Sauvegarde JSON
    saveProjectButton.addEventListener('click', () => {
      if (!validateConfig()) return;
      const config = {
        title: bookTitleInput.value,
        fileName: fileNameInput.value,
        pageSize: pageSizeSelect.value,
        bgColor: bgColorInput.value,
        font: fontSelect.value,
        fontSize: fontSizeInput.value,
        textColor: textColorInput.value,
      };
      const project = { config, pages };
      const json = JSON.stringify(project, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.fileName}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', 'Projet sauvegardé !');
      console.log('Project saved:', config.fileName);
    });

    // Charger JSON
    loadProjectButton.addEventListener('click', () => {
      loadFileInput.click();
      console.log('Load project triggered');
    });

    loadFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const project = JSON.parse(e.target.result);
          if (!project.config || !Array.isArray(project.pages)) {
            throw new Error('Format de fichier invalide');
          }
          bookTitleInput.value = project.config.title || '';
          fileNameInput.value = project.config.fileName || '';
          pageSizeSelect.value = project.config.pageSize || 'a4';
          bgColorInput.value = project.config.bgColor || '#FFFFFF';
          fontSelect.value = project.config.font || 'Arial';
          fontSizeInput.value = project.config.fontSize || '12';
          textColorInput.value = project.config.textColor || '#000000';
          pages = project.pages.filter((page) => page.image && page.template);
          updateCarousel();
          saveConfig();
          showToast('success', 'Projet chargé avec succès !');
          console.log('Project loaded:', project.config.fileName);
        } catch (error) {
          console.error('Load file error:', error);
          showToast('error', 'Fichier invalide.');
        }
      };
      reader.readAsText(file);
    });

    // Exporter PDF
    exportPDFButton.addEventListener('click', () => {
      if (!validateConfig()) return;
      if (!pages.length) {
        showToast('error', 'Aucune page à exporter.');
        return;
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: pageSizeSelect.value,
      });
      const sizes = {
        a4: [8.27, 11.69],
        a5: [5.83, 8.27],
        '6x9': [6, 9],
        '8.5x11': [8.5, 11],
      };
      const [width, height] = sizes[pageSizeSelect.value] || sizes['a4'];
      const margin = 0.5; // Marge en pouces

      // Mapper les polices pour compatibilité jsPDF
      const fontMap = {
        Roboto: 'Helvetica',
        Arial: 'Helvetica',
        'Times New Roman': 'Times',
      };

      pages.forEach((page, index) => {
        if (index > 0) doc.addPage();
        doc.setFillColor(bgColorInput.value);
        doc.rect(0, 0, width, height, 'F');

        let imgWidth, imgHeight, imgX, imgY, textY;

        if (page.template === 'full-page') {
          imgWidth = width; // Pleine page, sans marges
          imgHeight = height;
          imgX = 0;
          imgY = 0;
        } else if (page.template === 'portrait-text') {
          imgWidth = width - 2 * margin;
          imgHeight = height * 0.7; // 70% pour l'image
          imgX = margin;
          imgY = margin;
          textY = imgHeight + margin + 0.5; // Texte en bas
        } else if (page.template === 'landscape-text') {
          imgWidth = width - 2 * margin;
          imgHeight = height * 0.6; // 60% pour l'image
          imgX = margin;
          imgY = margin; // Image en haut
          textY = imgHeight + margin + 0.5; // Texte en bas
        }

        doc.addImage(page.image, 'JPEG', imgX, imgY, imgWidth, imgHeight, undefined, 'FAST');

        if (page.template !== 'full-page' && page.prompt) {
          const selectedFont = fontSelect.value;
          const pdfFont = fontMap[selectedFont] || 'Helvetica';
          doc.setFont(pdfFont);
          doc.setTextColor(textColorInput.value);
          const fontSize = parseInt(fontSizeInput.value) || 12;
          doc.setFontSize(fontSize);
          doc.text(page.prompt, margin, textY, { maxWidth: width - 2 * margin });
          if (selectedFont !== pdfFont) {
            showToast('warning', `Police ${selectedFont} non disponible, utilisation de ${pdfFont}.`);
          }
        }
      });
      const fileName = fileNameInput.value || 'livre_sans_titre';
      doc.save(`${fileName}.pdf`);
      showToast('success', 'PDF exporté !');
      console.log('PDF exported:', fileName);
    });

    // Effacer projet
    clearProjectButton.addEventListener('click', () => {
      showModal('Effacer tout le projet ?', true);
      modalConfirm.onclick = () => {
        pages = [];
        bookTitleInput.value = '';
        fileNameInput.value = '';
        pageSizeSelect.value = 'a4';
        bgColorInput.value = '#FFFFFF';
        fontSelect.value = 'Arial';
        fontSizeInput.value = '12';
        textColorInput.value = '#000000';
        pageTemplate.value = 'full-page';
        imagePrompt.value = '';
        promptField.style.display = 'none';
        clearPreview();
        updateCarousel();
        saveConfig();
        modal.style.display = 'none';
        showToast('success', 'Projet réinitialisé !');
        console.log('Project cleared');
      };
    });

    // Afficher modale
    function showModal(message, showConfirm = false) {
      modalMessage.textContent = message;
      modalConfirm.style.display = showConfirm ? 'inline-block' : 'none';
      modal.style.display = 'block';
      console.log('Modal shown:', message);
    }

    // Fermer modale
    modalClose.addEventListener('click', () => {
      modal.style.display = 'none';
      modalConfirm.onclick = null;
      console.log('Modal closed');
    });

    // Afficher toast avec file d'attente
    function showToast(type, message) {
      toastQueue.push({ type, message });
      console.log(`Toast queued: ${type} - ${message}`);
      if (!isToastActive) {
        displayNextToast();
      }
    }

    function displayNextToast() {
      if (toastQueue.length === 0) {
        isToastActive = false;
        return;
      }
      isToastActive = true;
      const { type, message } = toastQueue.shift();
      toast.classList.remove('toast-success', 'toast-warning', 'toast-error', 'toast-info');
      toast.classList.add(`toast-${type}`);
      toast.textContent = message;
      toast.style.display = 'block';
      toast.classList.add('active');
      console.log(`Toast displayed: ${type} - ${message}`);
      setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => {
          toast.style.display = 'none';
          isToastActive = false;
          displayNextToast(); // Afficher le suivant
        }, 300);
      }, 3000);
    }

    // Vérification DPI
    function checkDPI(img) {
      const minDPI = 300;
      const pageSize = pageSizeSelect.value;
      const sizes = {
        a4: [8.27, 11.69],
        a5: [5.83, 8.27],
        '6x9': [6, 9],
        '8.5x11': [8.5, 11],
      };
      const [widthInches, heightInches] = sizes[pageSize] || sizes['a4'];
      const dpiX = img.width / widthInches;
      const dpiY = img.height / heightInches;
      const dpi = Math.min(dpiX, dpiY);
      console.log('DPI calculated:', { dpiX, dpiY, dpi });
      if (dpi < minDPI) {
        showToast('warning', `DPI estimé : ${Math.round(dpi)}. KDP recommande 300 DPI minimum.`);
      }
    }

    // Gestion image
    function handleImage(file) {
      if (!file || !file.type.startsWith('image/')) {
        showToast('error', 'Fichier image invalide.');
        console.error('Invalid file type:', file ? file.type : 'undefined');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          console.log('Image loaded:', { width: img.width, height: img.height });
          checkDPI(img);
          currentImage = e.target.result;
          updatePreview();
          addPageButton.disabled = false;
          showToast('success', 'Image chargée !');
        };
        img.onerror = () => {
          console.error('Image load error');
          showToast('error', 'Erreur de chargement de l’image.');
        };
        img.src = e.target.result;
      };
      reader.onerror = () => {
        console.error('Reader error');
        showToast('error', 'Erreur de lecture fichier.');
      };
      reader.readAsDataURL(file);
    }

    // Mettre à jour prévisualisation
    function updatePreview() {
      previewZone.innerHTML = currentImage
        ? `<img src="${currentImage}" alt="Prévisualisation">`
        : '<p>Aucune image sélectionnée</p>';
      console.log('Preview updated:', currentImage ? 'Image affichée' : 'Aucune');
    }

    // Vider prévisualisation
    function clearPreview() {
      currentImage = null;
      addPageButton.disabled = true;
      updatePreview();
      console.log('Preview cleared');
    }

    // Mettre à jour carrousel
    function updateCarousel() {
      console.log('Updating carousel:', pages.length, 'pages');
      pageCarousel.innerHTML = '';
      if (pages.length === 0) {
        pageCarousel.innerHTML = `
                    <div class="empty-page">
                        <p>Aucune page</p>
                        <button class="edit-page">Ajouter une page</button>
                    </div>`;
        pageCarousel.querySelector('.edit-page').addEventListener('click', () => {
          showToast('info', 'Chargez une image pour ajouter une page.');
        });
      } else {
        pages.forEach((page, index) => {
          const pageItem = document.createElement('div');
          pageItem.className = 'page-thumbnail';
          pageItem.setAttribute('draggable', 'true');
          pageItem.dataset.index = index;
          pageItem.innerHTML = `
                        <div class="page-number">Page ${index + 1}</div>
                        <img src="${page.image}" alt="Page ${index + 1}">
                        <button class="edit-page">Éditer</button>
                        <button class="delete-page">Supprimer</button>
                    `;
          pageCarousel.appendChild(pageItem);
          console.log(`Page ${index + 1} ajoutée au carrousel`);

          // Éditer
          pageItem.querySelector('.edit-page').addEventListener('click', () => {
            pageTemplate.value = page.template;
            promptField.style.display = page.template === 'full-page' ? 'none' : 'block';
            imagePrompt.value = page.prompt || '';
            currentImage = page.image;
            updatePreview();
            addPageButton.disabled = false;
            showToast('info', 'Éditez et ajoutez la page.');
          });

          // Supprimer
          pageItem.querySelector('.delete-page').addEventListener('click', () => {
            showModal(`Supprimer la page ${index + 1} ?`, true);
            modalConfirm.onclick = () => {
              pages.splice(index, 1);
              updateCarousel();
              modal.style.display = 'none';
              showToast('success', 'Page supprimée !');
              console.log(`Page ${index + 1} supprimée`);
            };
          });

          // Glisser-déposer
          pageItem.addEventListener('dragstart', (e) => {
            dragIndex = parseInt(pageItem.dataset.index);
            pageItem.classList.add('dragging');
            console.log('Dragstart:', dragIndex);
          });

          pageItem.addEventListener('dragover', (e) => {
            e.preventDefault();
          });

          pageItem.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetIndex = parseInt(pageItem.dataset.index);
            if (dragIndex !== targetIndex) {
              const [page] = pages.splice(dragIndex, 1);
              pages.splice(targetIndex, 0, page);
              updateCarousel();
              showToast('success', 'Page déplacée !');
              console.log(`Page déplacée de ${dragIndex} à ${targetIndex}`);
            }
          });

          pageItem.addEventListener('dragend', () => {
            pageItem.classList.remove('dragging');
            dragIndex = null;
            console.log('Dragend');
          });
        });
      }
    }

    // Initialisation
    updateCarousel();
    addPageButton.disabled = true;
    console.log('✅ Initialisation terminée');
  } catch (error) {
    console.error('Initialization error:', error);
    alert('Erreur lors de l’initialisation. Vérifiez la console.');
  }
});