document.addEventListener('DOMContentLoaded', function() {
    
    const uploadForm = document.getElementById('itemUploadForm');
    
    if (uploadForm) {
        
        uploadForm.addEventListener('submit', function(event) {
            
            event.preventDefault(); 
            const formData = new FormData(uploadForm);            
            const itemData = {};
            for (const [key, value] of formData.entries()) {
                itemData[key] = value;
            }
                        
            console.log('Auction Item Data Collected (NTD values):');
            console.log(itemData);            
            alert('Listing submitted! Waiting for server confirmation...');            
        });
    } else {
        console.error("Error: itemUploadForm element not found.");
    }
});