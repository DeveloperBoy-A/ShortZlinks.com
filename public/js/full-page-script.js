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
                
                // Rewrite the href to pass through the API instantly
                // Example: https://shortz.com/api?api=TOKEN&url=ORIGINAL_URL
                const encodedUrl = encodeURIComponent(links[i].href);
                links[i].href = `${shortz_domain}/api?api=${shortz_api_token}&url=${encodedUrl}`;
                links[i].target = "_blank"; // Ensure it opens in a new tab for better UX
            }
        } catch (e) {
            // Invalid URL format, skip
            continue;
        }
    }
})();
          
