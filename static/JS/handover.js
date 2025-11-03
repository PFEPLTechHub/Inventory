let inventoryData;
let initiatedData;
let selectedItems = [];
let currentSource = 'All';
var session_data;
let uploadedImages = {};


// Fetch and process data on window load
window.onload = function() {
  fetchDataAndInitialize();
};

function fetchDataAndInitialize() {
  fetch('/cart_items')
    .then(response => response.json())
    .then(result => {
      console.log("Raw result from server:", result);
      const combinedData = result.combined_data;
      console.log("Combined data:", combinedData);

      if (Array.isArray(combinedData) && combinedData.length === 5 ) {
        // 0: inventory rows (already filtered server-side)
        // 1: dropdown map (nameProjectDict)
        // 2: (unused legacy slot)
        // 3: session_data
        // 4: sender_projects (strings; your helper already supports strings)
        inventoryData = Array.isArray(combinedData[0]) ? combinedData[0] : [];
        const nameProjectDict = combinedData[1] || {};
        session_data = combinedData[3] || {};

        // no client-side initiated filtering anymore
        initiatedData = {};

        populateSenderAndSource(session_data);
        populateDropdowns(nameProjectDict);
        adjustButtonsVisibility(session_data);

        displaySelectTable();
        toggleSelectedItemsHeader();
        showSelectTab();
        populateSourceDropdown(combinedData[4]);

        const src = document.getElementById('Source');
        if (src) src.addEventListener('change', handleSourceChange);

        patchInventoryDataWithProjectId(); // harmless fallback
      } else {
        console.error('Combined data is not valid:', combinedData);
      }
    })
    .catch(error => console.error('Error fetching data:', error));
}


// Patch inventoryData to ensure each item has a project_id property
function patchInventoryDataWithProjectId() {
  if (!Array.isArray(inventoryData)) return;
  let nameProjectDict = window.nameProjectDict || {};
  if (typeof populateDropdowns.lastDict === 'object') {
    nameProjectDict = populateDropdowns.lastDict;
  }
  inventoryData.forEach(item => {
    if (!item.project_id && item.Project && nameProjectDict[item.Project] && nameProjectDict[item.Project].employees && nameProjectDict[item.Project].employees.length > 0) {
      item.project_id = nameProjectDict[item.Project].employees[0][2];
    }
  });
}

function populateSourceDropdown(senderProjects) {
  const sourceDropdown = document.getElementById('Source');
  sourceDropdown.innerHTML = '';
  // Add "All" option to the dropdown
  const allOption = document.createElement('option');
  allOption.value = 'All';
  allOption.textContent = 'All';
  sourceDropdown.appendChild(allOption);

  // Try to get nameProjectDict from global or window scope
  let nameProjectDict = window.nameProjectDict || {};
  if (typeof populateDropdowns.lastDict === 'object') {
    nameProjectDict = populateDropdowns.lastDict;
  }
  senderProjects.forEach(project => {
    let project_id = project.project_id;
    let project_name = project.Projects;
    // If project is a string, look up in nameProjectDict
    if (typeof project === 'string') {
      project_name = project;
      if (nameProjectDict[project] && nameProjectDict[project].employees && nameProjectDict[project].employees.length > 0) {
        project_id = nameProjectDict[project].employees[0][2];
      } else {
        project_id = project;
      }
    }
    const option = document.createElement('option');
    option.value = project_id;
    option.textContent = project_name;
    sourceDropdown.appendChild(option);
  });
}

// Save nameProjectDict for use in populateSourceDropdown
const _origPopulateDropdowns = populateDropdowns;
populateDropdowns = function(nameProjectDict) {
  populateDropdowns.lastDict = nameProjectDict;
  _origPopulateDropdowns(nameProjectDict);
}

function handleSourceChange() {
  currentSource = document.getElementById('Source').value;
  selectedItems = []; // Clear selected items when source changes
  displaySelectTable(currentSource);
  displayItemsSelectedTable(); // Refresh the selected items table
  toggleSelectedItemsHeader(); // Update the no items selected header
}

function populateSenderAndSource(details) {
  // Set the text content of 'Sender' element
  document.getElementById('Sender').textContent = details.Name;
  
  // Assuming the Source element should be populated similarly
  // document.getElementById('Source').textContent = details.Name;
}
function populateDropdowns(nameProjectDict) {
  const receiverDropdown = document.getElementById('Receiver');
  const destinationDropdown = document.getElementById('Destination');

  // Augment nameProjectDict with project IDs and names from inventoryData
  if (Array.isArray(inventoryData)) {
    inventoryData.forEach(item => {
      if (item.Project && item.project_id && !nameProjectDict[item.Project]) {
        nameProjectDict[item.Project] = { employees: [[null, item.Project, item.project_id]] };
      }
    });
  }

  // Create a Set to store unique projects
  const uniqueProjects = new Set(Object.keys(nameProjectDict));

  // Populate the Destination dropdown with unique projects
  uniqueProjects.forEach(project => {
    const projectData = nameProjectDict[project];
    if (projectData && projectData.employees && projectData.employees.length > 0) {
      const project_id = projectData.employees[0][2]; // Get project_id from first employee
      const option = document.createElement('option');
      option.value = project_id; // Use project_id as value
      option.textContent = project; // Display project name
      destinationDropdown.appendChild(option);
    }
  });

  destinationDropdown.addEventListener('change', function() {
    const selectedProjectId = this.value;
    let selectedProjectName = null;
    // Find project name by project_id
    for (let key in nameProjectDict) {
      const employees = nameProjectDict[key].employees;
      if (employees && employees.length > 0 && String(employees[0][2]) === String(selectedProjectId)) {
        selectedProjectName = key;
        break;
      }
    }
    senderid = session_data.ID;
    sendername = session_data.Name;
    populateReceiverDropdown(selectedProjectName, nameProjectDict, receiverDropdown, senderid, sendername);
  });
}




function populateReceiverDropdown(selectedProject, nameProjectDict, receiverDropdown, senderId, senderName) {
  // Clear previous options in Receiver dropdown
  receiverDropdown.innerHTML = '';

  // Add the sender to the Receiver dropdown
  // const senderOption = document.createElement('option');
  // senderOption.value = senderName;
  // senderOption.textContent = senderName;
  // senderOption.setAttribute('data-type', 'user'); // Mark sender as a normal user
  // receiverDropdown.appendChild(senderOption);

const senderOption = document.createElement('option');
senderOption.value = senderId; // session_data.ID (userinfo_uid)
senderOption.textContent = senderName;
senderOption.setAttribute('data-type', 'user');
senderOption.setAttribute('data-name', senderName);
receiverDropdown.appendChild(senderOption);




  // Get the project data from the combined data structure
  const projectData = nameProjectDict[selectedProject];

  if (projectData) {
    // ✅ Add all managers
    if (projectData.managers && Array.isArray(projectData.managers)) {
    projectData.managers.forEach(manager => {
    const option = document.createElement('option');
    option.value = manager[0]; // ✅ manager_index_id
    option.textContent = manager[1]; // Manager name
    option.setAttribute('data-type', 'manager');
    option.setAttribute('data-name', manager[1]); // Optional: to retrieve name later
    receiverDropdown.appendChild(option);
  });
}


    // ✅ Add employees
   if (projectData.employees) {
  projectData.employees.forEach(employee => {
    const option = document.createElement('option');
    option.value = employee[0]; // ✅ userinfo_uid
    option.textContent = employee[1]; // Employee name
    option.setAttribute('data-type', 'user');
    option.setAttribute('data-name', employee[1]); // Optional: to retrieve name later
    receiverDropdown.appendChild(option);
  });
}

  }
}




function toggleSelectedItemsHeader() {
  const noItemsHeader = document.getElementById('no-items-selected');
  const table = document.getElementById('maintable');
  const tbody = table ? table.querySelector('tbody') : null;

  if (!tbody || tbody.children.length === 0) {
    noItemsHeader.style.display = 'block';
    noItemsHeader.textContent = 'No items selected';
  } else {
    noItemsHeader.style.display = 'none';
  }
}

function showItemsSelectedTab() {
  clearTabs();
  document.getElementById('itemsSelected').style.display = 'block';
  document.getElementById('selectableTab').style.display = 'none';
  document.getElementById('selected-items').style.backgroundColor = '#404040';
  document.getElementById('choose-items').style.backgroundColor = '#262626';
  displayItemsSelectedTable();
  toggleSelectedItemsHeader();
}

function showSelectTab() {
  clearTabs();
  document.getElementById('selectableTab').style.display = 'block';
  document.getElementById('itemsSelected').style.display = 'none';
  document.getElementById('selected-items').style.backgroundColor = '#262626';
  document.getElementById('choose-items').style.backgroundColor = '#404040';
  displaySelectTable(currentSource);
}

function clearTabs() {
  document.getElementById('itemsSelected').style.display = 'none';
  document.getElementById('selectableTab').style.display = 'none';
}

function calculateSelectableData(sourceProjectId) {
  console.log("Calculating selectable data with sourceProjectId:", sourceProjectId);
  console.log("Current inventory data:", inventoryData);
  console.log("Current initiated data:", initiatedData);
  
  let resolvedSourceProjectId = sourceProjectId;
  
  // If sourceProjectId is a string and not 'All', try to resolve it to a numeric ID
  if (typeof sourceProjectId === 'string' && sourceProjectId !== 'All') {
    let nameProjectDict = window.nameProjectDict || {};
    if (typeof populateDropdowns.lastDict === 'object') {
      nameProjectDict = populateDropdowns.lastDict;
    }
    for (let project_name in nameProjectDict) {
      if (project_name === sourceProjectId) {
        const projectData = nameProjectDict[project_name];
        if (projectData && projectData.employees && projectData.employees.length > 0) {
          resolvedSourceProjectId = projectData.employees[0][2];
          console.log(`Resolved sourceProjectId from name to ID: ${sourceProjectId} -> ${resolvedSourceProjectId}`);
          break;
        }
      }
    }
  }

  return inventoryData
    .filter(inventoryItem => {
      // If 'All' is selected, show all
      if (!resolvedSourceProjectId || resolvedSourceProjectId === 'All') {
        console.log("Showing all items due to All source selection");
        return true;
      }
      // inventoryItem.Project may be project name, so compare with project_id if available
      if (inventoryItem.project_id) {
        const match = String(inventoryItem.project_id) === String(resolvedSourceProjectId);
        console.log(`Comparing project_id ${inventoryItem.project_id} with ${resolvedSourceProjectId}: ${match}`);
        return match;
      }
      // fallback: try to match by project name if project_id is not present
      const match = String(inventoryItem.Project) === String(resolvedSourceProjectId);
      console.log(`Comparing project name ${inventoryItem.Project} with ${resolvedSourceProjectId}: ${match}`);
      return match;
    })
    .filter(inventoryItem => {
      const notInitiated = !initiatedData.hasOwnProperty(inventoryItem.ProductID);
      console.log(`Checking if item ${inventoryItem.ProductID} is not initiated: ${notInitiated}`);
      return notInitiated;
    })
    .map(inventoryItem => ({
      ...inventoryItem,
      disabled: isSelected(inventoryItem.ProductID)
    }));
}


function handleCheckboxChange(checkbox, itemId, item) {
  const selectedSource = document.getElementById('Source').value;
  if (checkbox.checked && selectedSource === 'All') {
    floatingMessageBox('Please select a Source first.');
    checkbox.checked = false;
    return;
  }

  if (checkbox.checked) {
    selectedItems.push({ ...item, condition: '', remark: '',image:'' });
  } else {
    selectedItems = selectedItems.filter(selectedItem => selectedItem.ProductID !== itemId);
  }
  displayItemsSelectedTable();
  toggleSelectedItemsHeader();
}


function handleConditionChange(itemId, condition) {
  const item = selectedItems.find(item => item.ProductID === itemId);
  if (item) {
    item.condition = parseInt(condition);
  }
}

function handleRemarkChange(itemId, remark) {
  const item = selectedItems.find(item => item.ProductID === itemId);
  if (item) {
    item.SenderRemark = remark;
    item.remark = remark;
    console.log('Updated item remarks:', item);
  }
}

function handleImageUpload(itemId, imageFile) {
  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('product_id', itemId);

  const statusSpan = document.querySelector(`.click-photo-btn[data-product-id="${itemId}"]`);
  const cell = statusSpan.closest('td'); // Get the parent cell

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/validate_image', true);

  xhr.upload.onprogress = function (event) {
    if (event.lengthComputable) {
      const percentComplete = Math.round((event.loaded / event.total) * 100);
      statusSpan.textContent = `${percentComplete}%`;
      statusSpan.style.color = '#333';
    }
  };

  xhr.onload = function () {
    if (xhr.status === 200) {
      const result = JSON.parse(xhr.responseText);
      
      // Store the image information regardless of validation status
      uploadedImages[itemId] = { 
        ext: result.ext, 
        name: result.name, 
        valid: result.is_valid || false,
        uploadStatus: result.is_valid ? 'success' : 'failed',
        message: result.message || ''
      };
      
      // Update UI based on validation result
      if (result.is_valid) {
        statusSpan.textContent = '✅';
        statusSpan.style.color = 'green';
      } else {
        statusSpan.textContent = '❌';
        statusSpan.style.color = 'red';
      }
      
      // Add click event to the entire cell for image viewing in carousel
      cell.style.cursor = 'pointer';
      cell.addEventListener('click', function() {
        OpenCarousel(itemId);
      });
      
      // Disable future uploads from the main page after initial upload
      const captureInput = document.querySelector(`.capture-photo-input[data-product-id="${itemId}"]`);
      if (captureInput) {
        captureInput.disabled = true;
      }
      
      // Update status span to indicate re-uploads must be done in carousel
      statusSpan.title = result.is_valid ? 
          "Image uploaded successfully. Click to view." : 
          "Invalid image. Click to view and re-upload.";
    } else {
      uploadedImages[itemId] = { 
        valid: false,
        uploadStatus: 'failed',
        message: `Server error: ${xhr.status}`
      };
      statusSpan.textContent = '❌';
      statusSpan.style.color = 'red';
      statusSpan.title = "Invalid image. Click to view and re-upload.";
    }
  };

  xhr.onerror = function () {
    uploadedImages[itemId] = { 
      valid: false,
      uploadStatus: 'failed',
      message: 'Network error during upload'
    };
    statusSpan.textContent = '❌';
    statusSpan.style.color = 'red';
    statusSpan.title = "Invalid image. Click to view and re-upload.";
  };

  xhr.send(formData);
}


function displayItemsSelectedTable() {
  const tab = document.getElementById('itemsSelected');
  const headers = ['Serial No', 'Set', 'Category', 'Name', 'Make', 'Model', 'Product Serial', 'Condition', 'Remark', 'image'];
  const table = createTableIfNotExists('maintable', headers, tab);
  table.innerHTML = createTableHeader(headers);

  const tbody = table.querySelector('tbody') || table.appendChild(document.createElement('tbody'));
  tbody.innerHTML = '';

  selectedItems.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.Set || ''}</td>
      <td>${item.Category || ''}</td>
      <td>${item.Name || ''}</td>
      <td>${item.Make || ''}</td>
      <td>${item.Model || ''}</td>
      <td>${item.ProductSerial || ''}</td>
      <td>
        <select onchange="handleConditionChange('${item.ProductID}', this.value)">
          <option value="">Select</option>
          <option value="0">Good</option>
          <option value="1">Not OK</option>
          <option value="2">Damaged</option>
        </select>
      </td>
      <td>
        <input type="text" placeholder="Enter remark" value="${item.remark || ''}"
               onchange="handleRemarkChange('${item.ProductID}', this.value)">
      </td>
      <td>
        <span class="click-photo-btn" data-product-id="${item.ProductID}"
              style="color: rgba(138, 43, 226, 0.7); font-size: 18px; cursor: pointer;"
              title="Click to add an image">➕</span>
        <input type="file" accept="image/*" capture="environment" class="capture-photo-input"
               data-product-id="${item.ProductID}" style="display: none;"
               ${uploadedImages[item.ProductID] ? 'disabled' : ''}>
      </td>
    `;

    const clickPhotoButton = row.querySelector('.click-photo-btn');
    const capturePhotoInput = row.querySelector('.capture-photo-input');

    if (uploadedImages[item.ProductID]) {
      if (uploadedImages[item.ProductID].valid) {
        clickPhotoButton.textContent = '✅';
        clickPhotoButton.style.color = 'green';
      } else {
        clickPhotoButton.textContent = '❌';
        clickPhotoButton.style.color = 'red';
      }
      clickPhotoButton.title = "Click to view image. Re-uploads can only be done from the carousel view.";
      const cell = clickPhotoButton.closest('td');
      cell.style.cursor = 'pointer';
      cell.addEventListener('click', function() { OpenCarousel(item.ProductID); });
    } else {
      clickPhotoButton.addEventListener('click', function (e) {
        e.preventDefault();
        capturePhotoInput.click();
      });
      capturePhotoInput.addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (!file) return;
        handleImageUpload(item.ProductID, file);
      });
    }

    tbody.appendChild(row);
  });
}


function updateSelectableData() {
  const tab = document.getElementById('selectableTab');
  const checkboxes = tab.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((checkbox, index) => {
    const itemId = selectableData[index].ProductID;
    checkbox.checked = isSelected(itemId);
  });
}

function displaySelectTable(sourceProjectId = null) {
  console.log("Displaying select table with inventoryData:", inventoryData);
  const dataToDisplay = calculateSelectableData(sourceProjectId);
  console.log("Filtered data to display:", dataToDisplay);

  const tab = document.getElementById('selectableTab');
  if (!tab) { console.error('selectableTab element not found'); return; }

  const table = createTable(['Serial', 'Select Item', 'Set', 'Category', 'Name', 'Make', 'Model', 'Product Serial']);
  const tbody = table.querySelector('tbody');

  dataToDisplay.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td><input type="checkbox" name="selectItem" value="${item.ProductID}" ${item.disabled ? 'checked' : ''}></td>
      <td>${item.Set || ''}</td>
      <td>${item.Category || ''}</td>
      <td>${item.Name || ''}</td>
      <td>${item.Make || ''}</td>
      <td>${item.Model || ''}</td>
      <td>${item.ProductSerial || ''}</td>
    `;
    row.querySelector('input[type="checkbox"]').addEventListener('change', function() {
      handleCheckboxChange(this, item.ProductID, item);
    });
    tbody.appendChild(row);
  });

  tab.innerHTML = '';
  tab.appendChild(table);
}


function isSelected(itemId) {
  return selectedItems.some(item => item.ProductID === itemId);
}

// Helper function to display floating messages
function floatingMessageBox(message, isError = false) {
  // Remove any existing message boxes
  const existingMsgBox = document.getElementById('floating-message-box');
  if (existingMsgBox) {
    document.body.removeChild(existingMsgBox);
  }
  
  // Create message box
  const msgBox = document.createElement('div');
  msgBox.id = 'floating-message-box';
  msgBox.style.position = 'fixed';
  msgBox.style.top = '20px';
  msgBox.style.left = '50%';
  msgBox.style.transform = 'translateX(-50%)';
  msgBox.style.backgroundColor = isError ? '#f44336' : '#4CAF50';
  msgBox.style.color = 'white';
  msgBox.style.padding = '15px 20px';
  msgBox.style.borderRadius = '5px';
  msgBox.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  msgBox.style.zIndex = '9999';
  msgBox.style.maxWidth = '80%';
  msgBox.style.textAlign = 'center';
  msgBox.style.fontSize = '16px';
  msgBox.textContent = message;
  
  // Add to document
  document.body.appendChild(msgBox);
  
  // Auto-close after 3 seconds
  setTimeout(() => {
    if (document.body.contains(msgBox)) {
      document.body.removeChild(msgBox);
    }
  }, 3000);
}

// Function to check if the user is on a mobile device
function isMobileDevice() {
  return /Mobi|Android|iPhone/i.test(navigator.userAgent);
}

//-------------------------------------------


function createTableIfNotExists(id, headers, parent) {
  let table = document.getElementById(id);
  if (!table) {
    table = createTable(headers);
    table.id = id;
    parent.appendChild(table);
  }
  return table;
}

function createTable(headers) {
  const table = document.createElement('table');
  table.innerHTML = createTableHeader(headers);
  table.appendChild(document.createElement('tbody'));
  return table;
}

function createTableHeader(headers) {
  return `<thead><tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr></thead>`;
}








//function declaration for OpenCarousel
// Global vars
let images = [];
let currentImageIndex = 0;
let previewRow, thumbnailBar;

// Make the preview functions globally visible
function updatePreview() {
  if (!images.length || !previewRow) return;

  previewRow.innerHTML = "";
  const img = document.createElement("img");
  img.src = images[currentImageIndex];
  img.classList.add("preview-img");
  previewRow.appendChild(img);
  updateActiveThumbnail();
}

function updateActiveThumbnail() {
  document.querySelectorAll(".thumb-img").forEach(img => img.classList.remove("active"));
  const active = document.querySelector(`.thumb-img[data-index="${currentImageIndex}"]`);
  if (active) active.classList.add("active");
}

// Function to get all ProductIDs with images from current transaction
function getAllProductIdsFromCurrentTransaction() {
  const table = document.getElementById('maintable');
  const productIds = [];
  
  if (table) {
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
      // Include all product IDs, not just those with images
      const imageCell = row.querySelector('td:last-child');
      const photoBtn = imageCell.querySelector('.click-photo-btn');
      if (photoBtn) {
        const productId = photoBtn.getAttribute('data-product-id');
        if (productId) {
          productIds.push(productId);
        }
      }
    });
  }
  console.log('Found ProductIDs in table:', productIds); // Debug log
  return productIds;
}

// Helper function to force reload of an image by removing it from cache
function forceImageReload(imageElement, src) {
  // Create a new Image object
  const newImage = new Image();
  
  // Set up the onload handler
  newImage.onload = function() {
    // Once the new image is loaded, update the source of the original element
    imageElement.src = this.src;
  };
  
  // Add cache-busting parameter and load the new image
  const cacheBuster = `?cb=${new Date().getTime()}`;
  newImage.src = src.includes('?') ? src : src + cacheBuster;
}

// Modified OpenCarousel function
function OpenCarousel(clickedProductId) {
  // Clear any cached images first
  if (typeof caches !== 'undefined') {
    caches.keys().then(function(names) {
      for (let name of names) {
        caches.delete(name);
      }
    });
  }
  
  // Create modal container
  const modal = document.createElement('div');
  modal.id = 'imageCarouselModal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0,0,0,0.95)';
  modal.style.zIndex = '1000';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';

  // Create top bar
  const topBar = document.createElement('div');
  topBar.style.width = '100%';
  topBar.style.height = '60px';
  topBar.style.backgroundColor = 'transparent';
  topBar.style.display = 'flex';
  topBar.style.alignItems = 'center';
  topBar.style.justifyContent = 'space-between';
  topBar.style.padding = '0 20px';
  topBar.style.boxSizing = 'border-box';
  topBar.style.position = 'absolute';
  topBar.style.top = '0';
  topBar.style.zIndex = '2';

  // Close button (X)
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.fontSize = '24px';
  closeBtn.style.color = 'white';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.padding = '10px';
  closeBtn.style.position = 'absolute';
  closeBtn.style.left = '20px';
  closeBtn.onclick = () => {
    document.body.removeChild(modal);
  };
  topBar.appendChild(closeBtn);

  // Action buttons container
  const actionBtns = document.createElement('div');
  actionBtns.style.display = 'flex';
  actionBtns.style.gap = '20px';
  actionBtns.style.marginLeft = 'auto';

  // Save button
  const saveBtn = document.createElement('button');
  saveBtn.innerHTML = '⬇️';
  saveBtn.style.fontSize = '24px';
  saveBtn.style.color = 'white';
  saveBtn.style.background = 'none';
  saveBtn.style.border = 'none';
  saveBtn.style.cursor = 'pointer';
  saveBtn.style.padding = '10px';
  saveBtn.title = "Download image";

  // Upload button (changed to + sign)
  const uploadBtn = document.createElement('button');
  uploadBtn.innerHTML = '➕';
  uploadBtn.style.fontSize = '24px';
  uploadBtn.style.color = 'white';
  uploadBtn.style.background = 'none';
  uploadBtn.style.border = 'none';
  uploadBtn.style.cursor = 'pointer';
  uploadBtn.style.padding = '10px';
  uploadBtn.title = "Replace this image";
  
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  if (isMobileDevice()) {
    fileInput.setAttribute('capture', 'environment');
  }
  fileInput.style.display = 'none';

  // Create a temporary thumbnail for upload progress
  const createUploadingThumbnail = (file, percentage) => {
    const thumbContainer = document.createElement('div');
    thumbContainer.style.position = 'relative';
    thumbContainer.style.width = '60px';
    thumbContainer.style.height = '60px';
    thumbContainer.style.margin = '0 4px';
    thumbContainer.style.borderRadius = '4px';
    thumbContainer.style.overflow = 'hidden';

    // Create image preview
    const thumbImg = document.createElement('img');
    const reader = new FileReader();
    reader.onload = (e) => {
      thumbImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    thumbImg.style.width = '100%';
    thumbImg.style.height = '100%';
    thumbImg.style.objectFit = 'cover';
    
    // Create percentage overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.color = 'white';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.fontSize = '14px';
    overlay.textContent = `${percentage}%`;

    thumbContainer.appendChild(thumbImg);
    thumbContainer.appendChild(overlay);
    return { container: thumbContainer, overlay: overlay, image: thumbImg };
  };

  // Create a temporary main image for upload progress
  const createUploadingMainImage = (file, percentage) => {
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.maxWidth = '100%';
    container.style.maxHeight = '75vh';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';

    // Create image preview
    const mainImg = document.createElement('img');
    const reader = new FileReader();
    reader.onload = (e) => {
      mainImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    mainImg.style.maxWidth = '100%';
    mainImg.style.maxHeight = '75vh';
    mainImg.style.objectFit = 'contain';
    
    // Create percentage overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '50%';
    overlay.style.left = '50%';
    overlay.style.transform = 'translate(-50%, -50%)';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.color = 'white';
    overlay.style.padding = '20px 40px';
    overlay.style.borderRadius = '10px';
    overlay.style.fontSize = '24px';
    overlay.textContent = `${percentage}%`;

    container.appendChild(mainImg);
    container.appendChild(overlay);
    return { container: container, overlay: overlay, image: mainImg };
  };
  
  uploadBtn.onclick = () => {
    // Get the currently active thumbnail
    const activeThumb = thumbnailBar.querySelector('div[style*="border: 2px solid rgb(255, 255, 255)"]');
    if (!activeThumb) {
      // Try alternative method to find active thumbnail based on current index
      const thumbnails = thumbnailBar.querySelectorAll('div');
      const activeByIndex = thumbnails[currentImageIndex];
      
      if (activeByIndex) {
        // If we found a thumbnail by index, use it and also apply the active style
        activeByIndex.style.border = '2px solid #fff';
        
        // Continue with upload using the found thumbnail
        const activeProductId = images[currentImageIndex].productId;
        console.log('Re-uploading image for product ID:', activeProductId);
        fileInput.click();
        return;
      }
      
      floatingMessageBox('Please select an image first before uploading a new one', 'red');
      return;
    }

    // Find the active image's data
    const currentIndex = Array.from(thumbnailBar.querySelectorAll('div')).indexOf(activeThumb);
    if (currentIndex === -1 || !images[currentIndex]) {
      console.error('Could not find active image data');
      return;
    }

    const activeProductId = images[currentIndex].productId;
    console.log('Re-uploading image for product ID:', activeProductId);

    fileInput.click();
  };
  
  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Get the active product ID
    const activeThumb = thumbnailBar.querySelector('div[style*="border: 2px solid rgb(255, 255, 255)"]');
    let activeProductId;
    let currentIndex;
    
    if (!activeThumb) {
      // Try to use currentImageIndex directly if we can't find an active thumbnail
      console.log('Using currentImageIndex as fallback:', currentImageIndex);
      currentIndex = currentImageIndex;
      activeProductId = images[currentIndex]?.productId;
      
      if (!activeProductId) {
        console.error('Could not determine active product ID');
        floatingMessageBox('Error: Could not determine which image to replace', true);
        return;
      }
    } else {
      currentIndex = Array.from(thumbnailBar.querySelectorAll('div')).indexOf(activeThumb);
      if (currentIndex === -1 || !images[currentIndex]) {
        console.error('Could not find active image data');
        floatingMessageBox('Error: Could not determine which image to replace', true);
        return;
      }
      activeProductId = images[currentIndex].productId;
    }

    console.log('Starting image re-upload process...');
    console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
    console.log('Using ProductID from active image:', activeProductId);

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('product_id', activeProductId);

    // Create temporary thumbnail and main image with progress
    console.log('Creating upload preview...');
    const uploadingThumb = createUploadingThumbnail(file, 0);
    thumbnailBar.appendChild(uploadingThumb.container);
    
    const uploadingMain = createUploadingMainImage(file, 0);
    imageContainer.innerHTML = '';
    imageContainer.appendChild(uploadingMain.container);

    // Send upload request
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/validate_image', true);

    // Track upload progress
    xhr.upload.onprogress = function(event) {
      if (event.lengthComputable) {
        const percentage = Math.round((event.loaded / event.total) * 100);
        console.log(`Upload progress for ${activeProductId}: ${percentage}%`);
        uploadingThumb.overlay.textContent = `${percentage}%`;
        uploadingMain.overlay.textContent = `${percentage}%`;
      }
    };

    xhr.onload = function() {
      console.log('Server response received');
      try {
        const result = JSON.parse(xhr.responseText);
        console.log('Parsed server response:', result);
        
        if (xhr.status === 200) {
          console.log('Upload completed, updating UI...');
          // Update uploadedImages object with the validation status from the server
          uploadedImages[activeProductId] = { 
            ext: result.ext, 
            name: result.name, 
            valid: result.is_valid || false,
            uploadStatus: result.is_valid ? 'success' : 'failed',
            message: result.message || ''
          };
          
          // Remove the uploading placeholder
          thumbnailBar.removeChild(uploadingThumb.container);
          
          // Show brief success/failure notification
          if (result.is_valid) {
            // For valid images, show a temporary success overlay
            uploadingMain.overlay.textContent = '✅';
            uploadingMain.overlay.style.backgroundColor = 'rgba(0, 128, 0, 0.7)';
            
            // After a brief delay, remove the overlay and update the image
            setTimeout(() => {
              // Base image path
              const imagePath = `/static/images/temp/${activeProductId}.${result.ext}`;
              
              // Hard reload the image to bypass browser cache completely
              hardReloadImage(imagePath).then(objectURL => {
                console.log('Created object URL for new image:', objectURL);
                
                // Update the existing image in the images array with validation status
                images[currentIndex] = {
                  path: objectURL, // Use the fresh blob URL
                  productId: activeProductId,
                  isValid: true
                };
                
                // Find the active thumbnail container
                const activeThumbContainer = activeThumb.closest('div');
                if (activeThumbContainer) {
                  // Create fresh image elements using our helper function
                  const imageElements = createImageElementsFromSource(objectURL, activeProductId, true, 'success');
                  
                  // Replace the old thumbnail with the new one
                  thumbnailBar.replaceChild(imageElements.thumbContainer, activeThumbContainer);
                  
                  // Set active state for the new thumbnail
                  imageElements.thumbImage.style.opacity = '1';
                  imageElements.thumbContainer.style.border = '2px solid #fff';
                  
                  // Add click handler to the new thumbnail container
                  imageElements.thumbContainer.onclick = () => {
                    updateCurrentImage(currentIndex, images);
                  };
                }
                
                // Update the main image display
                imageContainer.innerHTML = '';
                imageContainer.appendChild(createImageElementsFromSource(objectURL, activeProductId, true, 'success').mainContainer);
                
                // Update the click-photo-btn in the main table
                const clickPhotoBtn = document.querySelector(`.click-photo-btn[data-product-id="${activeProductId}"]`);
                if (clickPhotoBtn) {
                  clickPhotoBtn.textContent = '✅';
                  clickPhotoBtn.style.color = 'green';
                  
                  // Add a data attribute with current timestamp to force the image to refresh when clicked again
                  const imageCell = clickPhotoBtn.closest('td');
                  if (imageCell) {
                    imageCell.setAttribute('data-timestamp', new Date().getTime());
                  }
                }
                
                // Show success message
                floatingMessageBox('Image successfully uploaded', false);
              }).catch(error => {
                console.error('Failed to reload image:', error);
                floatingMessageBox('Image uploaded but failed to display. Please try again.', true);
                
                // Create a cache-busting URL for the path
                const cachedPath = `${imagePath}?t=${new Date().getTime()}`;
                
                // Update the existing image in the images array with validation status
                images[currentIndex] = {
                  path: cachedPath,
                  productId: activeProductId,
                  isValid: false  // This is for an invalid image
                };
                
                // Find the active thumbnail container
                const activeThumbContainer = activeThumb.closest('div');
                if (activeThumbContainer) {
                  // Create fresh image elements using our helper function
                  const imageElements = createImageElementsFromSource(cachedPath, activeProductId, false, 'failed');  // Mark as invalid
                  
                  // Replace the old thumbnail with the new one
                  thumbnailBar.replaceChild(imageElements.thumbContainer, activeThumbContainer);
                  
                  // Set active state for the new thumbnail
                  imageElements.thumbImage.style.opacity = '1';
                  imageElements.thumbContainer.style.border = '2px solid #fff';
                  
                  // Add click handler to the new thumbnail container
                  imageElements.thumbContainer.onclick = () => {
                    updateCurrentImage(currentIndex, images);
                  };
                }
                
                // Update the main image display
                imageContainer.innerHTML = '';
                imageContainer.appendChild(createImageElementsFromSource(cachedPath, activeProductId, false, 'failed').mainContainer);  // Mark as invalid
                
                // Update the click-photo-btn in the main table
                const clickPhotoBtn = document.querySelector(`.click-photo-btn[data-product-id="${activeProductId}"]`);
                if (clickPhotoBtn) {
                  clickPhotoBtn.textContent = '❌';  // Show as invalid
                  clickPhotoBtn.style.color = 'red';
                  
                  // Add a data attribute with current timestamp to force the image to refresh when clicked again
                  const imageCell = clickPhotoBtn.closest('td');
                  if (imageCell) {
                    imageCell.setAttribute('data-timestamp', new Date().getTime());
                  }
                }
                
                updateCurrentImage(currentIndex, images);
              });
            }, 1500);
          } else {
            // For invalid images, keep showing the error state
            uploadingMain.overlay.textContent = '❌ Invalid Image';
            uploadingMain.overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
            
            // After a brief delay, update the image but keep the invalid indicator
            setTimeout(() => {
              // Base image path
              const imagePath = `/static/images/temp/${activeProductId}.${result.ext}`;
              
              // Hard reload the image to bypass browser cache completely
              hardReloadImage(imagePath).then(objectURL => {
                console.log('Created object URL for new image:', objectURL);
                
                // Update the existing image in the images array with validation status
                images[currentIndex] = {
                  path: objectURL,
                  productId: activeProductId,
                  isValid: false
                };
                
                // Find the active thumbnail container
                const activeThumbContainer = activeThumb.closest('div');
                if (activeThumbContainer) {
                  // Create fresh image elements using our helper function
                  const imageElements = createImageElementsFromSource(objectURL, activeProductId, false, 'failed');
                  
                  // Replace the old thumbnail with the new one
                  thumbnailBar.replaceChild(imageElements.thumbContainer, activeThumbContainer);
                  
                  // Set active state for the new thumbnail
                  imageElements.thumbImage.style.opacity = '1';
                  imageElements.thumbContainer.style.border = '2px solid #fff';
                  
                  // Add click handler to the new thumbnail container
                  imageElements.thumbContainer.onclick = () => {
                    updateCurrentImage(currentIndex, images);
                  };
                }
                
                // Update the main image display
                imageContainer.innerHTML = '';
                imageContainer.appendChild(createImageElementsFromSource(objectURL, activeProductId, false, 'failed').mainContainer);
                
                // Update the click-photo-btn in the main table
                const clickPhotoBtn = document.querySelector(`.click-photo-btn[data-product-id="${activeProductId}"]`);
                if (clickPhotoBtn) {
                  clickPhotoBtn.textContent = '❌';
                  clickPhotoBtn.style.color = 'red';
                  
                  // Add a data attribute with current timestamp to force the image to refresh when clicked again
                  const imageCell = clickPhotoBtn.closest('td');
                  if (imageCell) {
                    imageCell.setAttribute('data-timestamp', new Date().getTime());
                  }
                }
                
                // Show error message
                floatingMessageBox('Invalid image uploaded', true);
              }).catch(error => {
                console.error('Failed to reload image:', error);
                floatingMessageBox('Image uploaded but failed to display. Please try again.', true);
                
                // Create a cache-busting URL for the path
                const cachedPath = `${imagePath}?t=${new Date().getTime()}`;
                
                // Update the existing image in the images array with validation status
                images[currentIndex] = {
                  path: cachedPath,
                  productId: activeProductId,
                  isValid: false  // This is for an invalid image
                };
                
                // Find the active thumbnail container
                const activeThumbContainer = activeThumb.closest('div');
                if (activeThumbContainer) {
                  // Create fresh image elements using our helper function
                  const imageElements = createImageElementsFromSource(cachedPath, activeProductId, false, 'failed');  // Mark as invalid
                  
                  // Replace the old thumbnail with the new one
                  thumbnailBar.replaceChild(imageElements.thumbContainer, activeThumbContainer);
                  
                  // Set active state for the new thumbnail
                  imageElements.thumbImage.style.opacity = '1';
                  imageElements.thumbContainer.style.border = '2px solid #fff';
                  
                  // Add click handler to the new thumbnail container
                  imageElements.thumbContainer.onclick = () => {
                    updateCurrentImage(currentIndex, images);
                  };
                }
                
                // Update the main image display
                imageContainer.innerHTML = '';
                imageContainer.appendChild(createImageElementsFromSource(cachedPath, activeProductId, false, 'failed').mainContainer);  // Mark as invalid
                
                // Update the click-photo-btn in the main table
                const clickPhotoBtn = document.querySelector(`.click-photo-btn[data-product-id="${activeProductId}"]`);
                if (clickPhotoBtn) {
                  clickPhotoBtn.textContent = '❌';  // Show as invalid
                  clickPhotoBtn.style.color = 'red';
                  
                  // Add a data attribute with current timestamp to force the image to refresh when clicked again
                  const imageCell = clickPhotoBtn.closest('td');
                  if (imageCell) {
                    imageCell.setAttribute('data-timestamp', new Date().getTime());
                  }
                }
                
                updateCurrentImage(currentIndex, images);
              });
            }, 2000);
          }
        } else {
          console.error('Upload failed:', xhr.status);
          uploadingThumb.overlay.textContent = '❌';
          uploadingMain.overlay.textContent = '❌ Upload Failed';
          uploadingMain.overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
          
          setTimeout(() => {
            thumbnailBar.removeChild(uploadingThumb.container);
            imageContainer.removeChild(uploadingMain.container);
            // Restore the previous image display
            updateCurrentImage(currentIndex, images);
            
            // Show error message
            floatingMessageBox('Upload failed', true);
          }, 2000);
        }
      } catch (error) {
        console.error('Error parsing server response:', error);
        uploadingThumb.overlay.textContent = '❌';
        uploadingMain.overlay.textContent = '❌ Error';
        uploadingMain.overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
        
        setTimeout(() => {
          thumbnailBar.removeChild(uploadingThumb.container);
          imageContainer.removeChild(uploadingMain.container);
          // Restore the previous image display
          updateCurrentImage(currentIndex, images);
          
          // Show error message
          floatingMessageBox('Error processing upload', true);
        }, 2000);
      }
    };

    xhr.onerror = function(error) {
      console.error('Network error during upload:', error);
      uploadingThumb.overlay.textContent = '❌';
      uploadingMain.overlay.textContent = '❌ Network Error';
      uploadingMain.overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
      
      setTimeout(() => {
        thumbnailBar.removeChild(uploadingThumb.container);
        imageContainer.removeChild(uploadingMain.container);
        // Restore the previous image display
        updateCurrentImage(currentIndex, images);
        
        // Show error message
        floatingMessageBox('Network error', true);
      }, 2000);
    };

    console.log('Starting upload request...');
    xhr.send(formData);
  };
  
  actionBtns.appendChild(saveBtn);
  actionBtns.appendChild(uploadBtn);
  topBar.appendChild(actionBtns);

  // Create main content area
  const mainContent = document.createElement('div');
  mainContent.style.flex = '1';
  mainContent.style.display = 'flex';
  mainContent.style.alignItems = 'center';
  mainContent.style.justifyContent = 'center';
  mainContent.style.position = 'relative';
  mainContent.style.padding = '20px';

  // Navigation buttons
  const createNavButton = (text, isNext) => {
    const btn = document.createElement('div');
    btn.innerHTML = isNext ? '›' : '‹';
    btn.style.position = 'absolute';
    btn.style[isNext ? 'right' : 'left'] = '10px';
    btn.style.top = '50%';
    btn.style.transform = 'translateY(-50%)';
    btn.style.fontSize = '35px';
    btn.style.fontWeight = '500';
    btn.style.color = '#fff';
    btn.style.background = '#5b5b5b';
    btn.style.border = 'none';
    btn.style.borderRadius = '50%';
    btn.style.width = '32px';
    btn.style.height = '32px';
    btn.style.cursor = 'pointer';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.transition = 'all 0.2s';
    btn.style.zIndex = '3';
    btn.style.padding = '0';
    btn.style.margin = '0';
    btn.style.lineHeight = '32px';
    btn.style.textAlign = 'center';
    btn.style.userSelect = 'none';

    if (isNext) {
      btn.style.paddingLeft = '2px';
    } else {
      btn.style.paddingRight = '2px';
    }

    btn.onmouseover = () => {
      btn.style.background = '#6e6e6e';
    };
    btn.onmouseout = () => {
      btn.style.background = '#5b5b5b';
    };

    return btn;
  };

  const prevBtn = createNavButton('‹', false);
  const nextBtn = createNavButton('›', true);

  // Create image container
  const imageContainer = document.createElement('div');
  imageContainer.style.maxWidth = '65%';
  imageContainer.style.maxHeight = 'calc(100vh - 200px)';
  imageContainer.style.display = 'flex';
  imageContainer.style.alignItems = 'center';
  imageContainer.style.justifyContent = 'center';
  imageContainer.style.position = 'relative';
  imageContainer.style.margin = '0 auto';

  // Create main image
  const mainImage = document.createElement('img');
  mainImage.className = 'main-image';
  mainImage.style.maxWidth = '100%';
  mainImage.style.maxHeight = '75vh';
  mainImage.style.objectFit = 'contain';
  mainImage.style.transition = 'transform 0.3s';
  mainImage.style.cursor = 'zoom-in';

  // Add zoom functionality
  let isZoomed = false;
  mainImage.onclick = () => {
    isZoomed = !isZoomed;
    mainImage.style.transform = isZoomed ? 'scale(2)' : 'scale(1)';
    mainImage.style.cursor = isZoomed ? 'zoom-out' : 'zoom-in';
  };

  imageContainer.appendChild(mainImage);
  mainContent.appendChild(imageContainer);

  // Create thumbnail bar
  const thumbnailBar = document.createElement('div');
  thumbnailBar.style.height = '80px';
  thumbnailBar.style.backgroundColor = 'transparent';
  thumbnailBar.style.display = 'flex';
  thumbnailBar.style.alignItems = 'center';
  thumbnailBar.style.justifyContent = 'center';
  thumbnailBar.style.gap = '8px';
  thumbnailBar.style.padding = '10px';
  thumbnailBar.style.position = 'absolute';
  thumbnailBar.style.bottom = '0';
  thumbnailBar.style.left = '0';
  thumbnailBar.style.right = '0';
  thumbnailBar.style.overflowX = 'auto';
  thumbnailBar.style.scrollBehavior = 'smooth';
  thumbnailBar.style.whiteSpace = 'nowrap';

  // Add components to modal
  modal.appendChild(topBar);
  modal.appendChild(mainContent);
  modal.appendChild(thumbnailBar);
  modal.appendChild(prevBtn);
  modal.appendChild(nextBtn);
  document.body.appendChild(modal);

  let currentImageIndex = 0;
  let allProductIds = getAllProductIdsFromCurrentTransaction();
  
  // Find the index of clicked product
  currentImageIndex = allProductIds.indexOf(clickedProductId);
  if (currentImageIndex === -1) currentImageIndex = 0;

  // Fetch images for all products in transaction
  const fetchAllImages = async () => {
    const allImages = [];
    const productIds = getAllProductIdsFromCurrentTransaction();
    console.log('Fetching images for ProductIDs:', productIds);
    console.log('Bypassing browser cache to ensure fresh images');

    try {
      // Fetch images for each product ID with cache busting
      const promises = productIds.map(pid => 
        fetch('/get_product_images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          body: JSON.stringify({ 
            product_id: pid,
            cache_bust: new Date().getTime() // Add timestamp to request body
          })
        })
        .then(response => response.json())
      );

      // Wait for all requests to complete
      const results = await Promise.all(promises);
      
      // Add timestamp for cache busting
      const timestamp = new Date().getTime();
      
      // Process all product IDs, including those without images
      productIds.forEach((productId, index) => {
        const data = results[index];
        let imageAdded = false;
        
        // Check if we got valid images from the server
        if (data.status === "success" && data.images && data.images.length > 0) {
          // Check validation status from uploadedImages
          let isValid = true; // Default to true
          
          // If we have validation info in uploadedImages, use that
          if (uploadedImages[productId] !== undefined) {
            isValid = uploadedImages[productId].valid === true;
          }
          
          console.log(`Product ID ${productId} validation status: ${isValid}`);
          
          data.images.forEach(img => {
            // Add cache busting to prevent browser from showing old images
            const imgWithCacheBust = `${img}?t=${timestamp}`;
            
            allImages.push({
              path: imgWithCacheBust,
              productId: productId,
              isValid: isValid,
              uploadStatus: isValid ? 'success' : 'failed'
            });
            imageAdded = true;
          });
        }
        
        // If no image was added for this product ID, add a placeholder
        if (!imageAdded) {
          console.log(`Adding placeholder for Product ID ${productId} - no uploaded image`);
          allImages.push({
            // Use a transparent pixel as placeholder
            path: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
            productId: productId,
            isValid: false,
            uploadStatus: 'none'
          });
        }
      });

      console.log('Combined images:', allImages);

      if (allImages.length > 0) {
        // Create thumbnails
        thumbnailBar.innerHTML = ''; // Clear existing thumbnails
        allImages.forEach((img, idx) => {
          console.log('Creating thumbnail for:', img);
          
          // Create image elements using our helper function
          const imageElements = createImageElementsFromSource(img.path, img.productId, img.isValid, img.uploadStatus);
          
          // Set initial state for thumbnails
          const thumbContainer = imageElements.thumbContainer;
          const thumbImg = imageElements.thumbImage;
          
          thumbContainer.style.border = idx === currentImageIndex ? '2px solid #fff' : '2px solid transparent';
          thumbImg.style.opacity = idx === currentImageIndex ? '1' : '0.6';
          
          // Set onclick event for the container
          thumbContainer.onclick = () => {
            updateCurrentImage(idx, allImages);
          };
          
          thumbnailBar.appendChild(thumbContainer);
        });

        // Setup navigation
        prevBtn.onclick = () => {
          if (currentImageIndex > 0) {
            updateCurrentImage(currentImageIndex - 1, allImages);
          }
        };

        nextBtn.onclick = () => {
          if (currentImageIndex < allImages.length - 1) {
            updateCurrentImage(currentImageIndex + 1, allImages);
          }
        };

        // Add keyboard navigation
        document.addEventListener('keydown', function(e) {
          if (e.key === 'ArrowLeft' && currentImageIndex > 0) {
            updateCurrentImage(currentImageIndex - 1, allImages);
          } else if (e.key === 'ArrowRight' && currentImageIndex < allImages.length - 1) {
            updateCurrentImage(currentImageIndex + 1, allImages);
          }
        });

        // Find index of clicked image
        const startIndex = allImages.findIndex(img => img.productId === clickedProductId);
        currentImageIndex = startIndex >= 0 ? startIndex : 0;

        // Initialize with clicked image
        updateCurrentImage(currentImageIndex, allImages);
        
        // Store images array globally for reference
        images = allImages;
      } else {
        console.log('No images found in response');
        imageContainer.innerHTML = '<div style="color: white; font-size: 16px;">No images available</div>';
      }
    } catch (error) {
      console.error('Error fetching images:', error);
      imageContainer.innerHTML = '<div style="color: white; font-size: 16px;">Error loading images</div>';
    }
  };

  // Start fetching images
  fetchAllImages();

  // Function to update current image and buttons
  const updateCurrentImage = (index, images) => {
    console.log('Updating to image index:', index, 'Image data:', images[index]);
    currentImageIndex = index;
    
    // Make sure the image has the uploadStatus property
    const img = images[index];
    if (img.uploadStatus === undefined) {
      img.uploadStatus = img.isValid ? 'success' : (uploadedImages[img.productId] ? 'failed' : 'none');
    }
    
    // Create image elements using our helper function
    const imageSrc = img.path;
    const imageElements = createImageElementsFromSource(imageSrc, img.productId, img.isValid, img.uploadStatus);
    
    // Clear the image container and add the new content
    imageContainer.innerHTML = '';
    imageContainer.appendChild(imageElements.mainContainer);
    
    // Update thumbnails
    // First update all thumbnails to non-active state
    thumbnailBar.querySelectorAll('img').forEach((thumb, idx) => {
      thumb.style.opacity = idx === index ? '1' : '0.6';
    });
    
    // Then update the containers and handles border highlighting
    const thumbnailContainers = thumbnailBar.querySelectorAll('div');
    thumbnailContainers.forEach((container, idx) => {
      if (container.querySelector('img')) { // Only process thumbnail containers
        // Update borders based on active state
        if (idx === index) {
          container.style.border = '2px solid #fff';
        } else {
          container.style.border = '2px solid transparent';
        }
      }
    });

    // Scroll the active thumbnail into view
    const activeContainer = thumbnailContainers[index];
    if (activeContainer) {
      const scrollOffset = activeContainer.offsetLeft - (thumbnailBar.offsetWidth / 2) + (activeContainer.offsetWidth / 2);
      thumbnailBar.scrollLeft = scrollOffset;
    }

    // Update save and upload buttons to work with current product ID
    const currentProductId = images[index].productId;
    
    saveBtn.onclick = () => {
      const link = document.createElement('a');
      link.href = images[index].path;
      link.download = `image_${currentProductId}_${Date.now()}.jpg`;
      link.click();
    };

    // Update navigation button visibility
    prevBtn.style.visibility = index > 0 ? 'visible' : 'hidden';
    nextBtn.style.visibility = index < images.length - 1 ? 'visible' : 'hidden';
  };

  // Close modal on click outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });

  // Close on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.body.removeChild(modal);
    }
  });
}

function renderThumbnails() {
  if (!thumbnailBar) return;
  thumbnailBar.innerHTML = "";
  
  images.forEach((imgSrc, index) => {
    const thumb = document.createElement("img");
    thumb.src = imgSrc;
    thumb.classList.add("thumb-img");
    thumb.dataset.index = index;
    thumb.addEventListener("click", () => {
      currentImageIndex = index;
      updatePreview();
    });
    thumbnailBar.appendChild(thumb);
  });
}

// Helper function to preload an image and ensure it's fresh
function preloadImage(src, callback) {
  console.log('Preloading image:', src);
  // Create new image element
  const img = new Image();
  
  // Set up handlers
  img.onload = function() {
    console.log('Image preloaded successfully:', src);
    if (callback) callback(true, this);
  };
  
  img.onerror = function() {
    console.error('Failed to preload image:', src);
    if (callback) callback(false, this);
  };
  
  // Add cache busting and set source to trigger loading
  const bustCache = src.includes('?') ? src : `${src}?bust=${new Date().getTime()}`;
  img.src = bustCache;
  
  return img;
}

// Force a hard reload of an image
function hardReloadImage(url) {
  return new Promise((resolve, reject) => {
    console.log('Hard reloading image:', url);
    
    // Use XMLHttpRequest to bypass cache completely
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url + (url.includes('?') ? '&' : '?') + 'nocache=' + new Date().getTime(), true);
    xhr.responseType = 'blob';
    
    xhr.onload = function() {
      if (this.status === 200) {
        const blob = this.response;
        const objectURL = URL.createObjectURL(blob);
        console.log('Image reloaded, created object URL:', objectURL);
        
        // Store the objectURL in a global map so we can revoke it later
        if (!window.blobURLs) window.blobURLs = {};
        window.blobURLs[objectURL] = true;
        
        resolve(objectURL);
      } else {
        console.error('Failed to reload image:', this.status);
        reject(new Error('Failed to reload image: ' + this.status));
      }
    };
    
    xhr.onerror = function() {
      console.error('Network error while reloading image');
      reject(new Error('Network error while reloading image'));
    };
    
    xhr.send();
  });
}

// Safe function to create shared thumbnails and main image
function createImageElementsFromSource(source, productId, isValid, uploadStatus = 'none') {
  // Unified handler for creating both thumbnails and main images
  // Returns an object with containers for both
  console.log('Creating image elements from source:', source);
  
  // Create main container
  const mainContainer = document.createElement('div');
  mainContainer.style.position = 'relative';
  mainContainer.style.display = 'inline-block';
  
  // Create main image
  const mainImg = document.createElement('img');
  mainImg.src = source;
  mainImg.className = 'main-image';
  mainImg.style.maxWidth = '100%';
  mainImg.style.maxHeight = '75vh';
  mainImg.style.objectFit = 'contain';
  mainImg.style.transition = 'transform 0.3s';
  mainImg.style.cursor = 'zoom-in';
  
  // Error handling for image
  mainImg.onerror = function() {
    console.error('Failed to load image:', source);
    this.onerror = null;
    this.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  };
  
  mainContainer.appendChild(mainImg);
  
  // Create thumbnail container
  const thumbContainer = document.createElement('div');
  thumbContainer.style.position = 'relative';
  thumbContainer.style.width = '60px';
  thumbContainer.style.height = '60px';
  thumbContainer.style.marginRight = '8px';
  thumbContainer.style.borderRadius = '4px';
  
  // Create thumbnail image
  const thumbImg = document.createElement('img');
  thumbImg.src = source;
  thumbImg.style.width = '100%';
  thumbImg.style.height = '100%';
  thumbImg.style.objectFit = 'cover';
  thumbImg.style.borderRadius = '4px';
  thumbImg.style.cursor = 'pointer';
  thumbImg.style.transition = 'all 0.2s ease';
  
  // Error handling for thumbnail
  thumbImg.onerror = function() {
    console.error('Failed to load thumbnail:', source);
    this.onerror = null;
    this.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  };
  
  thumbContainer.appendChild(thumbImg);
  
  // Add indicator based on upload status
  if (!isValid) {
    // Use purple color (#8a2be2) for the + sign for not-yet-uploaded images
    const indicatorText = uploadStatus === 'none' ? '+' : '❌';
    const indicatorColor = uploadStatus === 'none' ? 'rgba(138, 43, 226, 0.7)' : 'rgba(255, 0, 0, 0.7)';
    
    const indicator = document.createElement('div');
    indicator.textContent = indicatorText;
    indicator.style.position = 'absolute';
    indicator.style.top = '2px';
    indicator.style.right = '2px';
    indicator.style.backgroundColor = indicatorColor;
    indicator.style.color = 'white';
    indicator.style.borderRadius = '50%';
    indicator.style.padding = '2px';
    indicator.style.fontSize = '10px';
    indicator.style.lineHeight = '10px';
    indicator.style.width = '14px';
    indicator.style.height = '14px';
    indicator.style.textAlign = 'center';
    thumbContainer.appendChild(indicator);
    
    // Add appropriate indicator to main image
    if (uploadStatus === 'none') {
      // For not-yet-uploaded images, show plain text "No Image" without button-like appearance
      const mainNoImageText = document.createElement('div');
      mainNoImageText.innerHTML = 'No Image';
      mainNoImageText.style.position = 'absolute';
      mainNoImageText.style.top = '10px';
      mainNoImageText.style.right = '10px';
      mainNoImageText.style.color = 'white';
      mainNoImageText.style.fontSize = '14px';
      mainNoImageText.style.fontWeight = 'bold';
      mainContainer.appendChild(mainNoImageText);
    } else {
      // For invalid images, show the invalid indicator
      const mainInvalidIndicator = document.createElement('div');
      mainInvalidIndicator.innerHTML = '❌ Invalid Image';
      mainInvalidIndicator.style.position = 'absolute';
      mainInvalidIndicator.style.top = '10px';
      mainInvalidIndicator.style.right = '10px';
      mainInvalidIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
      mainInvalidIndicator.style.color = 'white';
      mainInvalidIndicator.style.padding = '5px 10px';
      mainInvalidIndicator.style.borderRadius = '4px';
      mainInvalidIndicator.style.fontSize = '14px';
      mainInvalidIndicator.style.fontWeight = 'bold';
      mainContainer.appendChild(mainInvalidIndicator);
    }
  }
  
  return {
    mainContainer: mainContainer,
    mainImage: mainImg,
    thumbContainer: thumbContainer,
    thumbImage: thumbImg
  };
}

// Add at the top or near other helpers
function getConditionText(val) {
  const conditions = {
    0: 'Good',
    1: 'Not OK',
    2: 'Damaged'
  };
  return conditions[val] || val;
}









