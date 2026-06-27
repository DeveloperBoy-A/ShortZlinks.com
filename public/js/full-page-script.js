(function() {
    // Check if configuration exists
    if (typeof shortz_domain === 'undefined' || typeof shortz_api_token === 'undefined') {
        console.error("ShortZlinks: Configuration missing.");
        return;
    }

    const excludeDomains = typeof shortz_exclude_domains !== 'undefined' ? shortz_exclude_domains : [];
    const currentHost = window.location.hostname;
    
    // Function to check if a domain should be excluded
    function isExcluded(urlHost) {
        if (urlHost === currentHost) return true; // Exclude internal links
        for (let i = 0; i < excludeDomains.length; i++) {
            if (urlHost.includes(excludeDomains[i])) return true;
        }
        return false;
    }

    // Find all links on the page
    const links = document.getElementsByTagName('a');

    for (let i = 0; i < links.length; i++) {
        try {
            const url = new URL(links[i].href);
            
            // Only process HTTP/HTTPS links and check exclusion list
            if ((url.protocol === 'http:' || url.protocol === 'https:') && !isExcluded(url.hostname)) {
                
                // On-Click Interception (Prevents server overload & redirects properly)
                links[i].addEventListener('click', async function(e) {
                    e.preventDefault(); // Stop normal click
                    const originalUrl = this.href;
                    
                    // Optional: Change cursor to show it's loading
                    document.body.style.cursor = 'wait';
                    
                    try {
                        const encodedUrl = encodeURIComponent(originalUrl);
                        // Fetching text format URL from API
                        const apiEndpoint = `${shortz_domain}/api?api=${shortz_api_token}&url=${encodedUrl}&format=text`;
                        
                        const response = await fetch(apiEndpoint);
                        const shortUrl = await response.text();
                        
                        // Reset cursor
                        document.body.style.cursor = 'default';
                        
                        // If API successfully returns the short link, redirect there
                        if (shortUrl && shortUrl.startsWith('http')) {
                            window.open(shortUrl, "_blank"); // Opens in new tab
                        } else {
                            // Fallback if error occurs
                            window.open(originalUrl, "_blank");
                        }
                    } catch (error) {
                        // If network error, still send user to destination securely
                        document.body.style.cursor = 'default';
                        window.open(originalUrl, "_blank");
                    }
                });
            }
        } catch (e) {
            // Invalid URL format, skip
            continue;
        }
    }
})();
