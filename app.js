import { db, storage } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-storage.js";

document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM Elements ----
    const form = document.getElementById('pledgeForm');
    const fullNameInput = document.getElementById('fullName');
    const phoneInput = document.getElementById('phone');
    const constituencySelect = document.getElementById('constituency');

    // Photo elements
    const fileInput = document.getElementById('fileInput');
    const uploadFileBtn = document.getElementById('uploadFileBtn');
    const takePhotoBtn = document.getElementById('takePhotoBtn');
    const photoPreviewContainer = document.getElementById('photoPreviewContainer');
    const photoPreview = document.getElementById('photoPreview');
    const photoActions = document.getElementById('photoActions');
    const retakeBtn = document.getElementById('retakeBtn');
    const photoError = document.getElementById('photoError');

    // Camera elements
    const cameraModal = document.getElementById('cameraModal');
    const cameraStream = document.getElementById('cameraStream');
    const cameraCanvas = document.getElementById('cameraCanvas');
    const captureBtn = document.getElementById('captureBtn');
    const closeCameraBtn = document.getElementById('closeCameraBtn');

    // UI elements
    const generateBtn = document.getElementById('generateBtn');
    const statusMessage = document.getElementById('statusMessage');
    const formCard = document.getElementById('formCard');
    const resultCard = document.getElementById('resultCard');
    const badgeCanvas = document.getElementById('badgeCanvas');
    const badgeImage = document.getElementById('badgeImage');
    const makeAnotherBtn = document.getElementById('makeAnotherBtn');

    let stream = null;
    let selectedImageSrc = null;

    // ---- Event Listeners ----

    // Photo Upload (File)
    uploadFileBtn.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setPhotoPreview(e.target.result);
            reader.readAsDataURL(file);
        }
    });

    retakeBtn.addEventListener('click', resetPhoto);

    // Camera Logic
    takePhotoBtn.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
            cameraStream.srcObject = stream;
            cameraModal.style.display = 'flex';
        } catch (err) {
            alert("Camera access denied or unavailabe. Please use Upload File instead.");
            console.error("Camera error:", err);
        }
    });

    closeCameraBtn.addEventListener('click', stopCamera);

    captureBtn.addEventListener('click', () => {
        // Draw video frame to canvas
        cameraCanvas.width = cameraStream.videoWidth;
        cameraCanvas.height = cameraStream.videoHeight;
        const ctx = cameraCanvas.getContext('2d');
        ctx.drawImage(cameraStream, 0, 0, cameraCanvas.width, cameraCanvas.height);
        
        const dataUrl = cameraCanvas.toDataURL('image/png');
        setPhotoPreview(dataUrl);
        stopCamera();
    });

    makeAnotherBtn.addEventListener('click', () => {
        form.reset();
        resetPhoto();
        resultCard.style.display = 'none';
        formCard.style.display = 'block';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        setLoading(true);
        updateStatus("Generating securely...");

        try {
            // 1. Generate Badge
            const badgeDataUrl = await generateBadge();
            
            // 2. Display Badge instantly
            badgeImage.src = badgeDataUrl;
            document.getElementById('downloadBadgeBtn').href = badgeDataUrl;
            
            // 3. Save to Firebase (Simulated/Attempted)
            updateStatus("Saving your pledge securely...");
            await uploadPledgeData(badgeDataUrl);

            // 4. Show Result
            formCard.style.display = 'none';
            resultCard.style.display = 'block';
            updateStatus("");

        } catch (err) {
            console.error(err);
            alert("An error occurred while generating the badge. Check console for details.");
            updateStatus("");
        } finally {
            setLoading(false);
        }
    });

    // ---- Helper Functions ----

    function setPhotoPreview(src) {
        selectedImageSrc = src;
        photoPreview.src = src;
        photoPreviewContainer.style.display = 'block';
        photoActions.style.display = 'none';
        setInteractionError(photoError.parentElement, false);
    }

    function resetPhoto() {
        selectedImageSrc = null;
        fileInput.value = '';
        photoPreviewContainer.style.display = 'none';
        photoActions.style.display = 'flex';
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        cameraModal.style.display = 'none';
    }

    function validateForm() {
        let isValid = true;

        if (!constituencySelect.value) {
            setInteractionError(constituencySelect.parentElement, true);
            isValid = false;
        } else {
            setInteractionError(constituencySelect.parentElement, false);
        }

        if (!fullNameInput.value.trim()) {
            setInteractionError(fullNameInput.parentElement, true);
            isValid = false;
        } else {
            setInteractionError(fullNameInput.parentElement, false);
        }

        const phoneVal = phoneInput.value.trim();
        if (!phoneVal || !/^[0-9]{10}$/.test(phoneVal)) {
            setInteractionError(phoneInput.parentElement, true);
            isValid = false;
        } else {
            setInteractionError(phoneInput.parentElement, false);
        }

        if (!selectedImageSrc) {
            setInteractionError(photoError.parentElement, true);
            isValid = false;
        } else {
            setInteractionError(photoError.parentElement, false);
        }

        return isValid;
    }

    function setInteractionError(parentEl, isError) {
        if (isError) {
            parentEl.classList.add('has-error');
        } else {
            parentEl.classList.remove('has-error');
        }
    }

    function setLoading(isLoading) {
        const btnText = generateBtn.querySelector('.btn-text');
        const spinner = generateBtn.querySelector('.spinner');
        generateBtn.disabled = isLoading;
        if (isLoading) {
            btnText.style.display = 'none';
            spinner.style.display = 'block';
        } else {
            btnText.style.display = 'block';
            spinner.style.display = 'none';
        }
    }

    function updateStatus(msg) {
        statusMessage.textContent = msg;
    }

    // ---- Badge Generation Logic ----
    
    async function generateBadge() {
        return new Promise((resolve, reject) => {
            const ctx = badgeCanvas.getContext('2d');
            const SIZE = 800;
            const CENTER = SIZE / 2;
            ctx.clearRect(0, 0, SIZE, SIZE);

            // 1. Draw Background & Outer Ring (Indian Flag Colors Gradient)
            const gradient = ctx.createLinearGradient(0, 0, SIZE, SIZE);
            gradient.addColorStop(0, '#ff9933'); // Saffron
            gradient.addColorStop(0.5, '#ffffff'); // White
            gradient.addColorStop(1, '#138808'); // Green

            ctx.beginPath();
            ctx.arc(CENTER, CENTER, 390, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.lineWidth = 15;
            ctx.strokeStyle = gradient;
            ctx.stroke();

            // Inner styling ring
            ctx.beginPath();
            ctx.arc(CENTER, CENTER, 370, 0, Math.PI * 2);
            ctx.lineWidth = 5;
            ctx.strokeStyle = '#000080'; // Ashoka Chakra Blue
            ctx.stroke();

            // 2. Draw user photo in the center
            const img = new Image();
            img.onload = () => {
                const imgSize = 360; // photo radius 180
                
                ctx.save();
                ctx.beginPath();
                ctx.arc(CENTER, CENTER - 50, 180, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip(); // clip to circle

                // calculate to crop center of image
                const ratio = Math.max(imgSize / img.width, imgSize / img.height);
                const drawWidth = img.width * ratio;
                const drawHeight = img.height * ratio;
                const dx = CENTER - drawWidth / 2;
                const dy = (CENTER - 50) - drawHeight / 2;
                
                ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
                ctx.restore();

                // Draw border for photo ring
                ctx.beginPath();
                ctx.arc(CENTER, CENTER - 50, 180, 0, Math.PI * 2);
                ctx.lineWidth = 8;
                ctx.strokeStyle = '#ff9933';
                ctx.stroke();

                // 3. Draw Texts
                ctx.textAlign = 'center';
                
                // Top Text
                ctx.font = 'bold 45px Roboto, sans-serif';
                ctx.fillStyle = '#138808';
                ctx.fillText("I'LL VOTE 100%", CENTER, 90);

                // Bottom text (My Vote My Pride)
                ctx.font = '900 60px Roboto, sans-serif';
                ctx.fillStyle = '#000080';
                ctx.fillText("MY VOTE MY PRIDE", CENTER, SIZE - 120);

                // User data
                ctx.font = 'bold 35px Roboto, sans-serif';
                ctx.fillStyle = '#333';
                ctx.fillText(fullNameInput.value.trim().toUpperCase(), CENTER, SIZE - 210);

                ctx.font = 'normal 26px Roboto, sans-serif';
                ctx.fillStyle = '#666';
                ctx.fillText(`${constituencySelect.value} Constituency`, CENTER, SIZE - 170);

                // Resolve
                resolve(badgeCanvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
            img.src = selectedImageSrc;
        });
    }

    // ---- Firebase Firestore Upload Logic ----
    
    async function uploadPledgeData(badgeDataUrl) {
        if (!db) {
            console.log("Firebase is not configured, skipping cloud save.");
            return;
        }

        // We only proceed if Firebase is initialized and not using placeholder credentials
        if (db.app.options.apiKey === "YOUR_API_KEY") {
            console.warn("Using placeholder Firebase credentials. Skipping real upload.");
            return;
        }

        try {
            const phoneStr = phoneInput.value.trim();
            
            // Save metadata and the image data directly to Firestore (Bypasses Storage CORS issues entirely)
            await addDoc(collection(db, "pledges"), {
                fullName: fullNameInput.value.trim(),
                phone: phoneStr,
                district: "Ramanathapuram",
                constituency: constituencySelect.value,
                badgeImageData: badgeDataUrl, // Saved directly to database
                createdAt: serverTimestamp()
            });

        } catch (e) {
            console.error("Error saving to Firebase DB: ", e);
            throw e;
        }
    }
});
