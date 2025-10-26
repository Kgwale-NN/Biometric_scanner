const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export async function registerUser(formData: FormData) {
    const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        body: formData,
    });
    return response.json();
}

export async function verifyFace(imageData: Blob) {
    const formData = new FormData();
    formData.append('face_image', imageData);

    const response = await fetch(`${API_URL}/verify-face`, {
        method: 'POST',
        body: formData,
    });
    return response.json();
}

export async function verifyPIN(pin: string) {
    const response = await fetch(`${API_URL}/verify-pin`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
    });
    return response.json();
}