function openFeedback() {
        document.getElementById('feedbackModal').style.display = 'flex';
    }
    function closeFeedback() {
        document.getElementById('feedbackModal').style.display = 'none';
        document.getElementById('feedbackText').value = '';
    }

    async function submitFeedback() {
        const message = document.getElementById('feedbackText').value.trim();
        if (!message) {
            showToast('Please enter some feedback first.', 'error');
            return;
        }

        try {
            const response = await fetch('https://formspree.io/f/mrenyqqn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            if (response.ok) {
                showToast('Thanks for the feedback!', 'success');
                closeFeedback();
            } else {
                showToast('Something went wrong sending feedback.', 'error');
            }
        } catch (err) {
            showToast('Network error — please try again later.', 'error');
        }
    }