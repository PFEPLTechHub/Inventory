function floatingMessageBox(message, color, formname) {
    var floatingBox = document.getElementById('floatingBox');
    var messageText = document.getElementById('messageText');
    var okButton = document.getElementById('okButton');

    // Split the message into lines based on newline characters
    const lines = message.split('\n');

    // Clear the existing message content (if any)
    messageText.textContent = '';

    // Create and append paragraphs for each line
    lines.forEach(line => {
        const paragraph = document.createElement('p');
        paragraph.textContent = line;
        paragraph.style.lineHeight = '0.9'; // Adjust as needed
        messageText.appendChild(paragraph);
    });

    // Set message text and display floating box
    floatingBox.style.display = 'block';

    // Apply styles based on color parameter
    if (color === 'brown') {
        floatingBox.style.backgroundColor = 'rgba(68, 68, 68, 0.914)'; // Brown background with 70% transparency
        messageText.style.color = 'white'; // White font color
    } else if (color === 'green') {
        floatingBox.style.backgroundColor = 'white'; // Light Green background
        messageText.style.color = 'green'; // Green font color
    } else if (color === 'red') {
        floatingBox.style.backgroundColor = 'red'; // Red background
        messageText.style.color = 'white'; // White font color
    }

    // Apply styles to the OK button
    okButton.style.backgroundColor = 'white'; // White background color
    okButton.style.color = 'black'; // Black font color
    okButton.style.border = 'none'; // Remove border

    // Add hover effect to the OK button
    okButton.addEventListener('mouseover', function() {
        okButton.style.backgroundColor = 'lightgray'; // Light gray background color on hover
    });

    okButton.addEventListener('mouseout', function() {
        okButton.style.backgroundColor = 'white'; // Restore white background color on mouseout
    });

    // Add an event listener to the "OK" button
    okButton.addEventListener('click', function() {
        floatingBox.style.animation = 'slideUp 0.5s ease forwards';
        setTimeout(function() {
            floatingBox.style.display = 'none';
            floatingBox.style.animation = ''; // Reset animation
            
            // Redirect based on formname
            if (formname === 'receivertable') {
                window.location.href = '/receive_table';
            } else if (formname === 'approvetable') {
                window.location.href = '/approvetable';
            } else if (formname === 'loginpage') {
                window.location.href = '/';
            } else if (formname === 'homepage') {
                window.location.href = '/homepage';
            }
            
        }, 500);
    });
}



function adjustButtonsVisibility(userData) {
    console.log('adjustButtonsVisibility received userData:', userData);
    const { TypeOfAccount, ID ,Name} = userData;
    console.log('adjustButtonsVisibility - Name:', Name, 'TypeOfAccount:', TypeOfAccount);
    // Define rules for each user type
    const userRules = {
        employee: {
            sectionsToRemove: ['approveitemsection','addeletesection','managesection','emppanelsection'],
            buttonsToRemove: ['projectInventoryBtn', 'totalInventoryBtn']
        },
        manager: {
            sectionsToRemove: ['addeletesection','managesection','emppanelsection'],
            buttonsToRemove: []
        },
        admin: {
            sectionsToRemove: ['approveitemsection','sendreceivesection',],
            buttonsToRemove: ['myInventoryBtn', 'projectInventoryBtn','deleteitemBtn']
        }
    };

    const rules = userRules[TypeOfAccount.toLowerCase()] || { sectionsToRemove: [], buttonsToRemove: [] };

    // Hide sections
    rules.sectionsToRemove.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
        }
    });

    // Hide buttons
    rules.buttonsToRemove.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.style.display = 'none';
        }
    });

    // Set the image source
    const userImage = document.querySelector('.header-image img');
    if (userImage) {
        const imagePath = `../static/Images/empimage.png`;
        userImage.src = imagePath;
    }

    // Set the user ID
    const userIdElement = document.getElementById('userid');
    if (userIdElement) {
        userIdElement.textContent = Name;
    }
}
