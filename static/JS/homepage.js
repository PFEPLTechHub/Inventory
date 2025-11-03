window.onload = function() {
    fetch('/get_session_data')
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if (data.error) {
                console.error('Error:', data.error);
                return;
            }
            


            adjustButtonsVisibility(data);    

        })
        .catch(error => console.error('Error:', error));
}

