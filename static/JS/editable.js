
window.onload = function () {
    fetch('/get_session_data')
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if (data.error) {
                console.error('Error:', data.error);
                return;
            }

            document.querySelector('input[name="id"]').value = data.ID;
            document.querySelector('input[name="designation"]').value = data.TypeOfAccount;
            document.querySelector('input[name="mail"]').value = data.MailID;
            document.querySelector('input[name="phoneno"]').value = data.PhoneNo;
            document.querySelector('input[name="name"]').value = data.Name;

            // Set project field based on account type
            const projectInput = document.querySelector('input[name="project"]');
            if (data.TypeOfAccount.toLowerCase() === 'admin') {
                projectInput.value = 'Not applicable (N/A)';
            } else {
                projectInput.value = Array.isArray(data.ProjectNames) && data.ProjectNames.length > 0
                    ? data.ProjectNames.join(', ')
                    : '—';
            }

            adjustButtonsVisibility(data);
        })
        .catch(error => console.error('Error:', error));
};
