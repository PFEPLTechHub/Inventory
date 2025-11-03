// Declare the data variable at the global scope
var data;

window.onload = function () {
  if (!sessionStorage.getItem("refreshed")) {
    // Refresh the page
    sessionStorage.setItem("refreshed", "true");
    window.location.reload();
  }
  var xhr2 = new XMLHttpRequest();
  
  // Get transaction_uid from URL
  const transaction_uid = window.location.pathname.split('/').pop();
  
  xhr2.open("GET", "/get_form_data?transaction_uid=" + encodeURIComponent(transaction_uid), true);
  xhr2.onreadystatechange = function () {
    if (xhr2.readyState == 4 && xhr2.status == 200) {
      data = JSON.parse(xhr2.responseText);

      // Extract the new structure
      var transactionDetails = data.transaction_details && data.transaction_details.length > 0 ? data.transaction_details[0] : {};
      var transactionProductDetails = data.transaction_product_details || [];
      var inventoryDetails = data.inventory_details || {};

      var table = document.getElementById("mainTable");
      console.log("We have reached");
      console.log(data);

      if (transactionDetails && Object.keys(transactionDetails).length > 0) {
        var firstFormData = transactionDetails;

        // Update labels with values from the first dictionary
        var initiationDateTime = firstFormData["InitiationDate"];
        var initiationDate = initiationDateTime
          ? initiationDateTime.split(" ")[0]
          : "Loading Initiation Date ...";

        var CompletionDate = firstFormData["CompletionDate"];
        if (CompletionDate && CompletionDate != "0" && CompletionDate != "-") {
          CompletionDate = CompletionDate.toString().split(" ")[0];
        } else if (CompletionDate == "0") {
          CompletionDate = "N/A";
        }

        var stage1 = "Completed";
        var stage2 = "Pending";
        var stage3 = "Pending";
        var stage4 = "Pending";

        function stages(firstFormData) {
          // Case: Disapproved at stage 2
          if (firstFormData["ApprovalToSend"] === 2 || firstFormData["ApprovalToSend"] === "2") {
            stage1 = "Completed";
            stage2 = "Disapproved";
            stage3 = "Pending";
            stage4 = "Pending";
            return;
          }
          // Case: Disapproved at stage 4
          if (
            (firstFormData["ApprovalToSend"] === 1 || firstFormData["ApprovalToSend"] === "1") &&
            (firstFormData["ApprovalToReceive"] === 2 || firstFormData["ApprovalToReceive"] === "2")
          ) {
            stage1 = "Completed";
            stage2 = "Completed";
            stage3 = "Disapproved";
            stage4 = "Pending";
            return;
          }
          // Case: Approved at both stages
          if (
            (firstFormData["ApprovalToSend"] === 1 || firstFormData["ApprovalToSend"] === "1") &&
            (firstFormData["ApprovalToReceive"] === 1 || firstFormData["ApprovalToReceive"] === "1")
          ) {
            stage1 = "Completed";
            stage2 = "Completed";
            stage3 = "Completed";
            stage4 = "Completed";
            return;
          }
          // Fallback to your previous logic for other cases
          if (
            firstFormData["ApprovalToSend"] === 1 &&
            firstFormData["CompletionDate"] === "-" &&
            firstFormData["ApprovalToReceive"] === "-"
          ) {
            stage2 = "Completed";
            return;
          } else if (firstFormData["ApprovalToSend"] === 0) {
            stage1 = "Completed";
            stage2 = "Disapproved";
            stage3 = "Disapproved";
            stage4 = "Disapproved";
            return;
          }
          if (
            firstFormData["ApprovalToSend"] === 1 &&
            firstFormData["CompletionDate"] !== "-" &&
            firstFormData["ApprovalToReceive"] === "-"
          ) {
            if (CompletionDate != "0" && CompletionDate != "-") {
              stage2 = "Completed";
              stage3 = "Completed";
              return;
            } else if (CompletionDate == "0") {
              stage2 = "Completed";
              stage3 = "Disapproved";
              stage4 = "Disapproved";
              return;
            }
          }
          if (firstFormData["ApprovalToReceive"] !== "-") {
            if (firstFormData["ApprovalToReceive"] === 1) {
              stage2 = "Completed";
              stage3 = "Completed";
              stage4 = "Completed";
              return;
            } else if (firstFormData["ApprovalToReceive"] === 0) {
              stage2 = "Completed";
              stage3 = "Completed";
              stage4 = "Disapproved";
              return;
            }
          }
        }
        stages(firstFormData);

        var ewayreason = firstFormData['ewayreason'];

        document.getElementById("ewaybillreasondatatd").textContent = ewayreason;

        if (ewayreason == "-") {
          document.getElementById("ewaybillreason").style.display = "none";
        }

        // Update HTML elements with the computed stages
        document.getElementById("formNo").textContent =
          firstFormData["Transaction_uid"] || "Loading Form ID ...";
        document.getElementById("ewaybillno").textContent =
          firstFormData["EwayBillNo"] || "Loading Eway Bill No ...";
        document.getElementById("Sender").textContent =
          firstFormData["SenderName"] || "Loading From Person ...";
        document.getElementById("Source").textContent = firstFormData["SourceName"] || firstFormData["Source"] || "Loading From Project ...";
        document.getElementById("Receiver").textContent =
          firstFormData["ReceiverName"] || "Loading To Person ...";
        document.getElementById("Destination").textContent = firstFormData["DestinationName"] || firstFormData["Destination"] || "Loading To Project ...";
        document.getElementById("InitiationDate").textContent = initiationDate;
        document.getElementById("CompletionDate").textContent = CompletionDate;
        document.getElementById("Stage1").textContent = stage1;
        document.getElementById("Stage2").textContent = stage2;
        document.getElementById("Stage3").textContent = stage3;
        document.getElementById("Stage4").textContent = stage4;

      // Set Sender Manager and Receiver Manager from project_managers
      if (data.project_managers && Array.isArray(data.project_managers)) {
        // Get source and destination values from the form data
        var sourceValue = firstFormData['Source'] || '';
        var destinationValue = firstFormData['Destination'] || '';
        
        var senderManagerName = '';
        var receiverManagerName = '';
        
        // Find managers by matching project_id
        for (var i = 0; i < data.project_managers.length; i++) {
          var projectManager = data.project_managers[i];
          console.log("[DEBUG] History - Comparing project_id:", projectManager.project_id, "with source:", sourceValue, "and destination:", destinationValue);
          
          if (String(projectManager.project_id) === String(sourceValue)) {
            senderManagerName = projectManager.ManagerName || projectManager.Manager;
            console.log("[DEBUG] History - Matched sender manager:", senderManagerName);
          }
          if (String(projectManager.project_id) === String(destinationValue)) {
            receiverManagerName = projectManager.ManagerName || projectManager.Manager;
            console.log("[DEBUG] History - Matched receiver manager:", receiverManagerName);
          }
        }
        
        document.getElementById("Sender-manager").textContent = senderManagerName || 'Manager not available';
        document.getElementById("Receiver-manager").textContent = receiverManagerName || 'Manager not available';
      } else {
          console.error("No project manager data available");
      }

      } else {
        console.error("No form data or invalid data format received");
      }

      // Clear table before inserting new rows
      while (table.rows.length > 1) {
        table.deleteRow(1);
      }

      // Render transaction_product_details in the table
      transactionProductDetails.forEach(function (row, index) {
        var newRow = table.insertRow();
        newRow.setAttribute('data-product-id', row["ProductID"]);
        newRow.insertCell(0).textContent = index + 1;

        // Status cell
        var statusCell = newRow.insertCell(1);
        var statusLabel = document.createElement("label");
        statusLabel.textContent =
          (row["CompletionDate"] == "-") || (row["CompletionDate"] == "0")
            ? "Rejected"
            : "Accepted";
        statusCell.appendChild(statusLabel);

        newRow.insertCell(2).textContent = row["Category"] || (inventoryDetails["Category"] || "");
        newRow.insertCell(3).textContent = row["Name"] || (inventoryDetails["Name"] || "");
        newRow.insertCell(4).textContent = row["Make"] || (inventoryDetails["Make"] || "");
        newRow.insertCell(5).textContent = row["Model"] || (inventoryDetails["Model"] || "");
        newRow.insertCell(6).textContent = row["ProductSerial"] || (inventoryDetails["ProductSerial"] || "");

        // Use mapping for SenderCondition and ReceiverCondition
        function getConditionText(val) {
          if (val === 0 || val === "0") return "Good";
          if (val === 1 || val === "1") return "Not OK";
          if (val === 2 || val === "2") return "Damaged";
          return val === undefined || val === null || val === "" ? "-" : val;
        }

        newRow.insertCell(7).textContent = getConditionText(row["SenderCondition"]);
        newRow.insertCell(8).textContent = row["SenderRemark"] || "-";

        // Sender Image column
        var senderImageCell = newRow.insertCell(9);
        var senderExt = row["SenderImage"];
        var formNo = document.getElementById("formNo") ? document.getElementById("formNo").textContent : "";
        if (senderExt && senderExt !== "-") {
          senderImageCell.innerHTML = `<span style="color: green; font-size: 20px; cursor: pointer; font-family: Arial;">✅</span>`;
          senderImageCell.style.cursor = 'pointer';
          senderImageCell.addEventListener('click', () => {
            OpenCarousel(row["ProductID"], 'sender');
          });
        } else {
          senderImageCell.innerHTML = `<span style="color: black; font-size: 16px; font-family: Arial;">-</span>`;
        }

        newRow.insertCell(10).textContent = getConditionText(row["ReceiverCondition"]);
        newRow.insertCell(11).textContent = row["ReceiverRemark"] || "-";

        // Receiver Image column
        var receiverImageCell = newRow.insertCell(12);
        var receiverExt = row["ReceiverImage"];
        if (receiverExt && receiverExt !== "-") {
          receiverImageCell.innerHTML = `<span style="color: green; font-size: 20px; cursor: pointer; font-family: Arial;">✅</span>`;
          receiverImageCell.style.cursor = 'pointer';
          receiverImageCell.addEventListener('click', () => {
            OpenCarousel(row["ProductID"], 'receiver');
          });
        } else {
          receiverImageCell.innerHTML = `<span style="color: black; font-size: 16px; font-family: Arial;">-</span>`;
        }

        newRow.insertCell(13).textContent = row["DisapproveRemarks"] || (transactionDetails["DisapproveRemarks"] || "-");
      });
    }
  };
  xhr2.send();
};

function OpenCarousel(productId, mode) {
    const formNo = document.getElementById('formNo') ? document.getElementById('formNo').textContent : '';
    let images = [];
    const table = document.getElementById('mainTable');
    const rows = table.querySelectorAll('tr');
    const productIds = [];
    rows.forEach((row, index) => {
        if (index !== 0) {
            const pid = row.getAttribute('data-product-id') || (row.cells[0] && row.cells[0].textContent);
            if (pid) productIds.push(pid);
        }
    });
    if (mode === 'sender') {
        images = productIds.map(pid => ({
            path: `/static/Images/${formNo}/${pid}_send.jpg`,
            productId: pid,
            isValid: true
        }));
    } else {
        images = productIds.map(pid => ({
            path: `/static/Images/${formNo}/${pid}_receive.jpg`,
            productId: pid,
            isValid: true
        }));
    }
    // Modal and carousel logic (with thumbnail bar and save button)
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
    const topBar = document.createElement('div');
    topBar.style.width = '100%';
    topBar.style.height = '60px';
    topBar.style.display = 'flex';
    topBar.style.alignItems = 'center';
    topBar.style.justifyContent = 'space-between';
    topBar.style.padding = '0 20px';
    topBar.style.position = 'absolute';
    topBar.style.top = '0';
    topBar.style.zIndex = '2';
    // Close (X) button
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
    closeBtn.onclick = () => { document.body.removeChild(modal); };
    topBar.appendChild(closeBtn);
    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.innerHTML = '⬇️';
    saveBtn.style.fontSize = '24px';
    saveBtn.style.color = 'white';
    saveBtn.style.background = 'none';
    saveBtn.style.border = 'none';
    saveBtn.style.cursor = 'pointer';
    saveBtn.style.padding = '10px';
    saveBtn.title = 'Download image';
    saveBtn.style.position = 'absolute';
    saveBtn.style.right = '20px';
    saveBtn.style.top = '0';
    topBar.appendChild(saveBtn);
    const mainContent = document.createElement('div');
    mainContent.style.flex = '1';
    mainContent.style.display = 'flex';
    mainContent.style.alignItems = 'center';
    mainContent.style.justifyContent = 'center';
    mainContent.style.position = 'relative';
    mainContent.style.padding = '20px';
    const imageContainer = document.createElement('div');
    imageContainer.style.maxWidth = '65%';
    imageContainer.style.maxHeight = 'calc(100vh - 200px)';
    imageContainer.style.display = 'flex';
    imageContainer.style.alignItems = 'center';
    imageContainer.style.justifyContent = 'center';
    imageContainer.style.position = 'relative';
    imageContainer.style.margin = '0 auto';
    mainContent.appendChild(imageContainer);
    // Thumbnail bar
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
    document.body.appendChild(modal);
    let currentImageIndex = images.findIndex(img => img.productId == productId);
    if (currentImageIndex === -1) currentImageIndex = 0;
    function updateCurrentImage(index) {
        const img = images[index];
        imageContainer.innerHTML = '';
        const mainImg = document.createElement('img');
        mainImg.src = img.path;
        mainImg.style.maxWidth = '100%';
        mainImg.style.maxHeight = '75vh';
        mainImg.style.objectFit = 'contain';
        mainImg.onerror = function() {
            this.onerror = null;
            this.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
        };
        imageContainer.appendChild(mainImg);
        // Save button logic
        saveBtn.onclick = () => {
            const link = document.createElement('a');
            link.href = img.path;
            link.download = `image_${img.productId}.jpg`;
            link.click();
        };
        // Update thumbnails
        const thumbs = thumbnailBar.querySelectorAll('.thumb-container');
        thumbs.forEach((thumb, idx) => {
            if (idx === index) {
                thumb.style.border = '2px solid #fff';
                thumb.style.boxShadow = '0 0 10px rgba(255,255,255,0.5)';
            } else {
                thumb.style.border = '2px solid transparent';
                thumb.style.boxShadow = 'none';
            }
        });
    }
    // Create thumbnails for all images
    images.forEach((img, idx) => {
        const thumbContainer = document.createElement('div');
        thumbContainer.className = 'thumb-container';
        thumbContainer.style.position = 'relative';
        thumbContainer.style.width = '60px';
        thumbContainer.style.height = '60px';
        thumbContainer.style.marginRight = '8px';
        thumbContainer.style.borderRadius = '4px';
        thumbContainer.style.border = idx === currentImageIndex ? '2px solid #fff' : '2px solid transparent';
        thumbContainer.style.cursor = 'pointer';
        thumbContainer.style.transition = 'all 0.2s ease';
        const thumbImg = document.createElement('img');
        thumbImg.src = img.path;
        thumbImg.style.width = '100%';
        thumbImg.style.height = '100%';
        thumbImg.style.objectFit = 'cover';
        thumbImg.style.borderRadius = '4px';
        thumbImg.style.opacity = idx === currentImageIndex ? '1' : '0.6';
        thumbImg.style.transition = 'all 0.2s ease';
        thumbImg.onerror = function() {
            this.onerror = null;
            this.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
        };
        thumbContainer.appendChild(thumbImg);
        thumbContainer.onclick = () => {
            updateCurrentImage(idx);
        };
        thumbnailBar.appendChild(thumbContainer);
    });
    updateCurrentImage(currentImageIndex);
    // Navigation buttons
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '←';
    prevBtn.style.fontSize = '36px';
    prevBtn.style.color = 'white';
    prevBtn.style.background = 'none';
    prevBtn.style.border = 'none';
    prevBtn.style.cursor = 'pointer';
    prevBtn.style.padding = '20px';
    prevBtn.style.position = 'absolute';
    prevBtn.style.left = '20px';
    prevBtn.style.top = '50%';
    prevBtn.style.transform = 'translateY(-50%)';
    prevBtn.style.zIndex = '3';
    prevBtn.onclick = () => {
        currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
        updateCurrentImage(currentImageIndex);
    };
    mainContent.appendChild(prevBtn);

    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '→';
    nextBtn.style.fontSize = '36px';
    nextBtn.style.color = 'white';
    nextBtn.style.background = 'none';
    nextBtn.style.border = 'none';
    nextBtn.style.cursor = 'pointer';
    nextBtn.style.padding = '20px';
    nextBtn.style.position = 'absolute';
    nextBtn.style.right = '20px';
    nextBtn.style.top = '50%';
    nextBtn.style.transform = 'translateY(-50%)';
    nextBtn.style.zIndex = '3';
    nextBtn.onclick = () => {
        currentImageIndex = (currentImageIndex + 1) % images.length;
        updateCurrentImage(currentImageIndex);
    };
    mainContent.appendChild(nextBtn);

    // Close on escape key
    document.addEventListener('keydown', function escListener(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(modal);
            document.removeEventListener('keydown', escListener);
        }
    });
}