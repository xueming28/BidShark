fetch('sideBar.html')
    .then(res => res.text())
    .then(html => {
        const sidebar = document.getElementById('sidebar');
        sidebar.innerHTML = html;
        const links = sidebar.querySelectorAll('a.nav-item');
        const currentPage = window.location.pathname.split('/').pop();
        links.forEach(link => {
            const linkPage = link.getAttribute('href');
            if (linkPage === currentPage) {
                link.classList.add('active');
            }
        });
    });

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