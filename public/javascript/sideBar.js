export async function collapse(){
    document.getElementById("toggleSidebar").addEventListener('click', function () {
        if(document.querySelector(".sidebar").classList.contains('collapsed')) {
            document.querySelector(".sidebar").classList.remove('collapsed');
            document.querySelector(".toggle-btn").classList.remove('collapsed');
            document.querySelector(".everything").classList.remove('collapsed');
            document.getElementById("toggleSidebar").innerHTML = '<svg fill="#000000" width="800px" height="800px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" transform="matrix(-1,0,0,1,0,0)">' +
                '<path d="M15.2928932,12 L12.1464466,8.85355339 C11.9511845,8.65829124 11.9511845,8.34170876 12.1464466,8.14644661 C12.3417088,7.95118446 12.6582912,7.95118446 12.8535534,8.14644661 L16.8535534,12.1464466 C17.0488155,12.3417088 17.0488155,12.6582912 16.8535534,12.8535534 L12.8535534,16.8535534 C12.6582912,17.0488155 12.3417088,17.0488155 12.1464466,16.8535534 C11.9511845,16.6582912 11.9511845,16.3417088 12.1464466,16.1464466 L15.2928932,13 L4.5,13 C4.22385763,13 4,12.7761424 4,12.5 C4,12.2238576 4.22385763,12 4.5,12 L15.2928932,12 Z M19,5.5 C19,5.22385763 19.2238576,5 19.5,5 C19.7761424,5 20,5.22385763 20,5.5 L20,19.5 C20,19.7761424 19.7761424,20 19.5,20 C19.2238576,20 19,19.7761424 19,19.5 L19,5.5 Z"></path>' +
                '</svg>';
        }else{
            document.querySelector(".sidebar").classList.toggle("collapsed");
            document.querySelector(".toggle-btn").classList.toggle('collapsed');
            document.querySelector(".everything").classList.toggle('collapsed');
            document.getElementById("toggleSidebar").innerHTML = '<svg fill="#000000" width="800px" height="800px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                '  <path d="M15.2928932,12 L12.1464466,8.85355339 C11.9511845,8.65829124 11.9511845,8.34170876 12.1464466,8.14644661 C12.3417088,7.95118446 12.6582912,7.95118446 12.8535534,8.14644661 L16.8535534,12.1464466 C17.0488155,12.3417088 17.0488155,12.6582912 16.8535534,12.8535534 L12.8535534,16.8535534 C12.6582912,17.0488155 12.3417088,17.0488155 12.1464466,16.8535534 C11.9511845,16.6582912 11.9511845,16.3417088 12.1464466,16.1464466 L15.2928932,13 L4.5,13 C4.22385763,13 4,12.7761424 4,12.5 C4,12.2238576 4.22385763,12 4.5,12 L15.2928932,12 Z M19,5.5 C19,5.22385763 19.2238576,5 19.5,5 C19.7761424,5 20,5.22385763 20,5.5 L20,19.5 C20,19.7761424 19.7761424,20 19.5,20 C19.2238576,20 19,19.7761424 19,19.5 L19,5.5 Z"/>' +
                '</svg>';
        }
    })
    //I am lazy so I a just putting it all in here
    //account part only shows up when you are logged in
    const res = await fetch('api/info/session', {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    if (!data.isLoggedIn) {
            document.getElementById("profile").classList.toggle("inactive");
    }
}