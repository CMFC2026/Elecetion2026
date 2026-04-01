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

            // Create circular clip for the main badge
            ctx.save();
            ctx.beginPath();
            ctx.arc(CENTER, CENTER, 390, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            
            // Draw Saffron Top
            ctx.fillStyle = '#ff9933';
            ctx.fillRect(0, 0, SIZE, 266);
            
            // Draw White Middle
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 266, SIZE, 268);
            
            // Draw Green Bottom
            ctx.fillStyle = '#138808';
            ctx.fillRect(0, 534, SIZE, 266);
            
            ctx.restore();
            
            // Draw outer white ring for dimension
            ctx.beginPath();
            ctx.arc(CENTER, CENTER, 390, 0, Math.PI * 2);
            ctx.lineWidth = 15;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            // Saffron elements
            // SVEEP box
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(140, 160, 140, 50, 10);
            } else {
                ctx.rect(140, 160, 140, 50);
            }
            ctx.fill();
            ctx.font = 'bold 24px Roboto, sans-serif';
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            ctx.fillText('SVEEP', 210, 193);

            // DISTRICT box (Using input value)
            const distName = document.getElementById('district').value || "RAMANATHAPURAM";
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(520, 160, 160, 50, 10);
            } else {
                ctx.rect(520, 160, 160, 50);
            }
            ctx.fill();
            ctx.font = 'bold 16px Roboto, sans-serif';
            ctx.fillStyle = '#000000';
            ctx.fillText(distName.toUpperCase(), 600, 185);
            ctx.fillText('DISTRICT', 600, 202);

            // ECI Logo placeholder (center)
            ctx.beginPath();
            ctx.arc(400, 185, 45, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#000080';
            ctx.stroke();
            ctx.font = 'bold 20px Roboto, sans-serif';
            ctx.fillStyle = '#000080';
            ctx.fillText('ECI', 400, 192);

            // 2. Draw user photo in the center
            const img = new Image();
            img.onload = () => {
                const imgSize = 440; // diameter
                
                ctx.save();
                ctx.beginPath();
                ctx.arc(CENTER, 480, 220, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip(); // clip to inner circle
                
                // calculate to crop center of image
                const ratio = Math.max(imgSize / img.width, imgSize / img.height);
                const drawWidth = img.width * ratio;
                const drawHeight = img.height * ratio;
                const dx = CENTER - drawWidth / 2;
                const dy = 480 - drawHeight / 2;
                
                // Draw white background in case image is transparent
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, SIZE, SIZE);
                
                ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

                // Add dark blue chord at bottom of inner circle
                // We are still clipped to the inner circle!
                ctx.beginPath();
                ctx.fillStyle = '#000080';
                ctx.fillRect(0, 560, SIZE, 200); // Only fills within the clipped bottom part
                
                // Add texts inside the blue chord
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.font = 'bold 20px Roboto, sans-serif';
                ctx.fillText("I'LL VOTE 100%", CENTER, 590);
                
                ctx.font = 'bold 24px Roboto, sans-serif';
                ctx.fillText("MY VOTE MY PRIDE", CENTER, 625);
                
                ctx.restore();

                // Draw thick white border for photo ring
                ctx.beginPath();
                ctx.arc(CENTER, 480, 220, 0, Math.PI * 2);
                ctx.lineWidth = 15;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();

                // Add faint shadow mapping via arc again
                ctx.beginPath();
                ctx.arc(CENTER, 480, 225, 0, Math.PI * 2);
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                ctx.stroke();

                // 3. Draw Green Area Text
                ctx.textAlign = 'center';
                ctx.font = 'bold 24px Roboto, sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.fillText("VOTING DAY : 23 APRIL 2026", CENTER, 750);

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
