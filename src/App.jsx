import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Download, Move, FileText, DollarSign, User, Palette, PlusCircle, PenTool, Type } from 'lucide-react';

// --- TEMPLATE CONFIGURATION ---
const TEMPLATES = [
  {
    id: 'receipt-birthday',
    name: 'Birthday Theme',
    image:'template2.jpg',
    defaultPositions: {
      name: { x: 145, y: 188, font: '26px Inter Bold', color: '#1E3A8A', fontSize: 26, colorCode: '#1E3A8A' },
      amount: { x: 154, y: 250, font: '36px Inter Bold', color: '#DC2626', fontSize: 36, colorCode: '#DC2626' },
      purpose: { x: 414, y: 262, font: '20px Inter', color: '#374151', fontSize: 20, colorCode: '#374151' },
    },
    canvasDimensions: { width: 800, height: 400 }
  }
];

const TEXT_FIELDS = ['name', 'amount', 'purpose'];

const App = () => {
  // --- STATE MANAGEMENT ---
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATES[0].id);
  const selectedTemplate = TEMPLATES.find(t => t.id === selectedTemplateId);

  const [formData, setFormData] = useState({
    name: 'Jane Doe',
    amount: '100.00',
    purpose: 'Disaster Relief Fund'
  });

  // State to hold the current, user-adjusted coordinates AND style properties
  const [positions, setPositions] = useState(TEMPLATES[0].defaultPositions); 
  
  // Canvas and drag state
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  // Image loading state
  const [templateImage, setTemplateImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);

  // --- HANDLERS FOR CUSTOMIZATION CONTROLS ---
  const handleStyleChange = useCallback((field, prop, value) => {
    setPositions(prev => {
        const newPositions = { ...prev };
        newPositions[field] = { ...newPositions[field], [prop]: value };

        // If changing fontSize or colorCode, update the composite properties too
        if (prop === 'fontSize') {
            const currentFont = newPositions[field].font;
            // Ensure font string maintains 'Inter Bold' or similar styles
            const fontParts = currentFont.split(' ');
            fontParts[0] = `${value}px`;
            const newFont = fontParts.join(' ');
            
            newPositions[field].font = newFont;
        } else if (prop === 'colorCode') {
            newPositions[field].color = value;
        }
        
        return newPositions;
    });
    // Set the field as active for immediate visual feedback in the Live Position card
    setActiveField(field); 
  }, []);


  // --- IMAGE LOADING LOGIC ---
  useEffect(() => {
    setImageLoading(true);
    setTemplateImage(null); // Clear old image
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Needed for Canvas download
    img.onload = () => {
      setTemplateImage(img);
      setImageLoading(false);
    };
    img.onerror = () => {
        console.error("Failed to load image:", selectedTemplate.image);
        setTemplateImage(null);
        setImageLoading(false);
    };
    img.src = selectedTemplate.image;

    // Reset positions when template changes
    // Deep copy to ensure independence
    setPositions(JSON.parse(JSON.stringify(selectedTemplate.defaultPositions)));
  }, [selectedTemplate.image, selectedTemplate.defaultPositions]);

  // --- CANVAS DRAWING LOGIC ---
  const drawSlip = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !templateImage || imageLoading) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = selectedTemplate.canvasDimensions;

    // Set canvas size (important for high-res drawing)
    canvas.width = width;
    canvas.height = height;

    // 1. Draw Template Background
    ctx.drawImage(templateImage, 0, 0, width, height);

    // 2. Draw Text Overlays
    TEXT_FIELDS.forEach(field => {
      const pos = positions[field];
      // Use the dynamically generated font style string
      const fontStyle = `${pos.fontSize}px ${pos.font.split(' ').slice(1).join(' ')}`;
      const text = `${field === 'amount' ? '₹' : ''}${formData[field] || ''}`; 

      ctx.font = fontStyle;
      ctx.fillStyle = pos.colorCode; // Use the raw color code for drawing
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      ctx.fillText(text, pos.x, pos.y);

      // 3. Highlight currently active/hovered field
      if (activeField === field) {
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = parseInt(pos.fontSize) * 1.2; // Use actual fontSize

        ctx.strokeStyle = '#F97316'; // Orange highlight
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(pos.x, pos.y, textWidth, textHeight);
        ctx.setLineDash([]);
      }
    });

  }, [formData, positions, selectedTemplate.canvasDimensions, templateImage, imageLoading, activeField]);

  // Redraw whenever relevant state changes
  useEffect(() => {
    drawSlip();
  }, [drawSlip, positions, formData, selectedTemplateId, templateImage]);

  // --- DRAG HANDLERS (Unchanged logic) ---
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = (e.clientX - rect.left) * scaleX;
    const clientY = (e.clientY - rect.top) * scaleY;

    const ctx = canvas.getContext('2d');
    let clickedField = null;

    for (const field of TEXT_FIELDS) {
      const pos = positions[field];
      const text = `${field === 'amount' ? '₹' : ''}${formData[field] || ''}`;

      ctx.font = `${pos.fontSize}px ${pos.font.split(' ').slice(1).join(' ')}`;
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = parseInt(pos.fontSize) * 1.2; 

      if (clientX >= pos.x && clientX <= pos.x + textWidth &&
          clientY >= pos.y && clientY <= pos.y + textHeight) {
        clickedField = field;
        break;
      }
    }

    if (clickedField) {
      setIsDragging(true);
      setActiveField(clickedField);
      setOffset({
        x: clientX - positions[clickedField].x,
        y: clientY - positions[clickedField].y,
      });
    } else {
      setActiveField(null); 
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !activeField) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const newX = (e.clientX - rect.left) * scaleX - offset.x;
    const newY = (e.clientY - rect.top) * scaleY - offset.y;

    setPositions(prev => ({
      ...prev,
      [activeField]: {
        ...prev[activeField],
        x: Math.round(newX),
        y: Math.round(newY),
      }
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // --- DOWNLOAD FUNCTION ---
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Clear active field highlight before downloading
    setActiveField(null); 
    drawSlip();

    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `donation_slip_${selectedTemplateId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // --- RENDER HELPERS ---
  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleTemplateChange = (e) => {
    setSelectedTemplateId(e.target.value);
  };

  const activePosition = activeField ? positions[activeField] : null;

  // Component for rendering the customization controls for a single field
  const CustomizationControls = ({ field, label }) => {
    const pos = positions[field] || selectedTemplate.defaultPositions[field];

    // Use current positions state for the values, falling back to default if necessary
    const currentFontSize = pos.fontSize || 20;
    const currentColor = pos.colorCode || '#000000';

    return (
        <div className="customization-group" 
             onClick={() => setActiveField(field)} 
             style={{ backgroundColor: activeField === field ? 'rgba(238, 242, 255, 0.8)' : 'transparent' }}>
            
            <div className="customization-header">
                <span className="customization-label">{label}</span>
                <div style={{ backgroundColor: currentColor }} className="color-preview"></div>
            </div>

            <div className="customization-inputs">
                {/* Font Size Control */}
                <div className="input-field-group">
                    <label htmlFor={`${field}-size`} className="input-field-label">
                        <Type className="icon-xs" /> Size ({currentFontSize}px)
                    </label>
                    <input
                        id={`${field}-size`}
                        type="range"
                        min="10"
                        max="80"
                        step="1"
                        value={currentFontSize}
                        onChange={(e) => handleStyleChange(field, 'fontSize', parseInt(e.target.value))}
                        className="range-input"
                    />
                </div>

                {/* Color Control */}
                <div className="input-field-group">
                    <label htmlFor={`${field}-color`} className="input-field-label">
                        <PenTool className="icon-xs" /> Color
                    </label>
                    <input
                        id={`${field}-color`}
                        type="color"
                        value={currentColor}
                        onChange={(e) => handleStyleChange(field, 'colorCode', e.target.value)}
                        className="color-input"
                    />
                </div>
            </div>
        </div>
    );
  };


  return (
    <div className="app-container">
      <style jsx="true">{`
        /* Global Setup */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        /* Customization Controls Styles */
        .customization-group {
            padding: 0.75rem;
            border-radius: 0.75rem;
            border: 1px solid #e5e7eb;
            transition: all 0.2s;
            cursor: pointer;
            margin-bottom: 1rem;
        }
        .customization-group:hover {
            border-color: #3b82f6;
        }
        .customization-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 0.75rem;
        }
        .customization-label {
            font-weight: 600;
            color: #1f2937;
            text-transform: uppercase;
            font-size: 0.875rem;
        }
        .color-preview {
            width: 1.25rem;
            height: 1.25rem;
            border-radius: 50%;
            border: 2px solid #fff;
            box-shadow: 0 0 0 1px #d1d5db;
        }
        .customization-inputs {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        .input-field-group {
            display: flex;
            flex-direction: column;
        }
        .input-field-label {
            font-size: 0.75rem;
            color: #4b5563;
            font-weight: 500;
            display: flex;
            align-items: center;
            margin-bottom: 0.25rem;
        }
        .icon-xs {
            width: 0.75rem;
            height: 0.75rem;
            margin-right: 0.25rem;
        }
        .range-input {
            width: 100%;
            height: 0.25rem;
            -webkit-appearance: none;
            background: #d1d5db;
            border-radius: 0.125rem;
        }
        .range-input::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 0.8rem;
            height: 0.8rem;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            box-shadow: 0 0 0 3px #bfdbfe;
        }
        .color-input {
            width: 100%;
            height: 2.5rem;
            padding: 0;
            border: 1px solid #e5e7eb;
            border-radius: 0.5rem;
            cursor: pointer;
            -webkit-appearance: none;
            appearance: none;
        }
        .color-input::-webkit-color-swatch-wrapper {
            padding: 0;
        }
        .color-input::-webkit-color-swatch {
            border: none;
            border-radius: 0.5rem;
        }


        /* Animations */
        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }

        /* Base Container */
        .app-container {
            min-height: 100vh;
            background: linear-gradient(to bottom right, #f9fafb, #eff6ff);
            font-family: 'Inter', sans-serif;
            overflow-x: hidden;
        }

        /* Scrollbar Styles */
        ::-webkit-scrollbar {
            width: 6px;
        }
        ::-webkit-scrollbar-track {
            background: #f1f5f9;
        }
        ::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
        }

        /* Glass & Shadow Utilities */
        .glass {
            backdrop-filter: blur(16px) saturate(180%);
            background-color: rgba(255, 255, 255, 0.75);
            border: 1px solid rgba(209, 213, 219, 0.3);
            border-radius: 1rem; /* rounded-2xl */
            transition: all 0.3s ease;
        }
        .glass:hover {
            background-color: rgba(255, 255, 255, 0.9);
        }
        .enhanced-shadow {
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        @media (min-width: 1024px) {
            .enhanced-shadow {
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            }
        }

        /* Header Styles */
        .header-container {
            padding: 1.5rem 1rem 2rem; /* pt-6 pb-8 px-4 */
        }
        @media (min-width: 640px) {
            .header-container {
                padding-left: 1.5rem; /* sm:px-6 */
                padding-right: 1.5rem; /* sm:px-6 */
            }
        }
        @media (min-width: 1024px) {
            .header-container {
                padding-left: 2rem; /* lg:px-8 */
                padding-right: 2rem; /* lg:px-8 */
            }
        }

        .max-width-center {
            max-width: 80rem; /* max-w-7xl */
            margin-left: auto;
            margin-right: auto;
            text-align: center;
        }

        .header-flex-center {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.5rem; /* mb-6 */
        }

        .header-icon-bg {
            background-image: linear-gradient(to right, #2563eb, #9333ea); /* from-blue-600 to-purple-600 */
            padding: 1rem;
            border-radius: 1.5rem; /* rounded-3xl */
            margin-bottom: 1rem; /* mb-4 */
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); /* shadow-2xl */
        }

        .icon-lg {
            width: 2.5rem; /* w-10 */
            height: 2.5rem; /* h-10 */
            color: white;
        }

        .space-y-2 > * + * {
            margin-top: 0.5rem;
        }

        .header-title {
            font-size: 1.5rem; /* text-2xl */
            font-weight: 800;
            color: #111827;
            line-height: 1.25;
            padding-left: 0.5rem;
            padding-right: 0.5rem;
        }
        @media (min-width: 640px) {
            .header-title { font-size: 1.875rem; } /* sm:text-3xl */
        }
        @media (min-width: 768px) {
            .header-title { font-size: 2.25rem; } /* md:text-4xl */
        }
        @media (min-width: 1024px) {
            .header-title { font-size: 3rem; } /* lg:text-5xl */
        }

        .header-divider {
            width: 5rem; /* w-20 */
            height: 0.25rem;
            background-image: linear-gradient(to right, #3b82f6, #9333ea);
            margin-left: auto;
            margin-right: auto;
            border-radius: 9999px;
        }
        @media (min-width: 640px) {
            .header-divider { width: 6rem; } /* sm:w-24 */
        }

        .header-subtitle {
            color: #4b5563;
            font-size: 1rem; /* text-base */
            max-width: 48rem; /* max-w-3xl */
            margin-left: auto;
            margin-right: auto;
            line-height: 1.625;
            padding-left: 1rem;
            padding-right: 1rem;
        }
        @media (min-width: 640px) {
            .header-subtitle { font-size: 1.125rem; } /* sm:text-lg */
        }
        @media (min-width: 1024px) {
            .header-subtitle { font-size: 1.25rem; } /* lg:text-xl */
        }

        /* Main Content Layout */
        .main-padding {
            padding: 0 0.75rem 2rem; /* px-3 pb-8 */
        }
        @media (min-width: 640px) {
            .main-padding {
                padding-left: 1.5rem; /* sm:px-6 */
                padding-right: 1.5rem; /* sm:px-6 */
                padding-bottom: 3rem; /* sm:pb-12 */
            }
        }
        @media (min-width: 1024px) {
            .main-padding {
                padding-left: 2rem; /* lg:px-8 */
                padding-right: 2rem; /* lg:px-8 */
            }
        }

        .main-layout {
            display: flex;
            flex-direction: column;
            gap: 1rem; /* gap-4 */
        }
        @media (min-width: 640px) {
            .main-layout {
                gap: 1.5rem; /* sm:gap-6 */
            }
        }
        @media (min-width: 1024px) {
            .main-layout {
                display: grid;
                grid-template-columns: repeat(12, minmax(0, 1fr));
                gap: 2rem; /* lg:gap-8 */
            }
        }

        .sidebar-controls {
            width: 100%;
            order: 2;
        }
        @media (min-width: 1024px) {
            .sidebar-controls {
                grid-column: span 4 / span 4; /* lg:col-span-4 */
                order: 1;
            }
        }
        @media (min-width: 1280px) {
            .sidebar-controls {
                grid-column: span 3 / span 3; /* xl:col-span-3 */
            }
        }

        .space-y-4 > * + * {
            margin-top: 1rem;
        }
        /* Mobile optimization for Slip Details inputs */
        .card.slip-details .space-y-4 > * + * {
            margin-top: 1.25rem; 
        }

        @media (min-width: 640px) {
            .space-y-6 > * + * {
                margin-top: 1.5rem;
            }
            .card.slip-details .space-y-4 > * + * {
                margin-top: 1rem; /* Reset to standard sm: size */
            }
        }
j
        /* Card General Styling */
        .card {
            padding: 1.25rem; /* Increased base padding for better touch targets */
            border-radius: 1rem; /* rounded-2xl */
            margin-top: 15px;
        }
        @media (min-width: 640px) {
            .card {
                padding: 1.5rem; /* sm:p-6 */
            }
        }

        .card-header {
            display: flex;
            align-items: center;
            margin-bottom: 1rem; /* mb-4 */
        }
        @media (min-width: 640px) {
            .card-header {
                margin-bottom: 1.5rem; /* sm:mb-6 */
            }
        }

        .card-title {
            font-size: 1.125rem; /* text-lg */
            font-weight: 700;
            color: #111827;
        }
        @media (min-width: 640px) {
            .card-title { font-size: 1.25rem; } /* sm:text-xl */
        }

        /* Icon Backgrounds */
        .icon-bg-yellow {
            background-image: linear-gradient(to right, #facc15, #f97316);
            padding: 0.5rem;
            border-radius: 0.75rem; /* rounded-xl */
            margin-right: 0.75rem; /* mr-3 */
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); /* shadow-lg */
        }
        .icon-bg-green {
            background-image: linear-gradient(to right, #4ade80, #3b82f6);
            padding: 0.5rem;
            border-radius: 0.75rem;
            margin-right: 0.75rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        .icon-bg-indigo {
            background-image: linear-gradient(to right, #818cf8, #a855f7);
            padding: 0.5rem;
            border-radius: 0.75rem;
            margin-right: 0.75rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        /* Icons */
        .icon-sm {
            width: 1rem; /* w-4 */
            height: 1rem; /* h-4 */
            color: white;
        }
        @media (min-width: 640px) {
            .icon-sm {
                width: 1.25rem; /* sm:w-5 */
                height: 1.25rem; /* sm:h-5 */
            }
        }

        /* Form Select/Input Styles */
        .form-select, .form-input {
            width: 96%;
            padding: 0.75rem; /* p-3 */
            border: 2px solid #e5e7eb;
            border-radius: 0.75rem; /* rounded-xl */
            transition: all 0.2s ease-in-out;
            background-color: white;
            color: #111827;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
            font-size: 0.875rem; /* text-sm */
        }
        .form-select {
            padding-right: 2.5rem; /* pr-10 */
            appearance: none;
            cursor: pointer;
            font-weight: 500;
        }
        .form-select:hover, .form-input:hover {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06); /* hover:shadow-md */
        }

        /* Focus styles for forms */
        .form-select:focus, .form-input:focus {
            border-color: #3b82f6; /* focus:border-blue-500 */
            box-shadow: 0 0 0 2px #bfdbfe, 0 0 0 4px #3b82f6; /* focus:ring-2 focus:ring-blue-500 */
            outline: none;
        }

        @media (min-width: 640px) {
            .form-select, .form-input {
                padding: 1rem; /* sm:p-4 */
                font-size: 1rem; /* sm:text-base */
            }
        }

        /* Template Info Box */
        .template-info-box {
            background-image: linear-gradient(to right, #eff6ff, #eef2ff);
            padding: 0.75rem;
            border-radius: 0.75rem;
            border: 1px solid #bfdbfe;
        }
        @media (min-width: 640px) {
            .template-info-box {
                padding: 1rem; /* sm:p-4 */
            }
        }

        .flex-responsive-between {
            display: flex;
            flex-direction: column;
        }
        @media (min-width: 640px) {
            .flex-responsive-between {
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
            }
        }

        .info-text-main {
            font-size: 0.875rem;
            font-weight: 500;
            color: #374151;
            margin-bottom: 0.25rem;
        }
        @media (min-width: 640px) {
            .info-text-main {
                margin-bottom: 0;
            }
        }

        .text-blue-semibold {
            color: #2563eb;
            font-weight: 600;
        }

        .text-xs-gray {
            font-size: 0.75rem;
            color: #6b7280;
        }

        /* Form Label/Input Container Styles */
        .form-label {
            display: flex;
            align-items: center;
            font-size: 0.875rem;
            font-weight: 600;
            color: #374151;
            margin-bottom: 0.5rem;
        }

        .label-icon-bg-blue {
            background-color: #dbeafe;
            padding: 0.375rem;
            border-radius: 0.5rem;
            margin-right: 0.5rem;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        .label-icon-bg-green {
            background-color: #d1fae5;
            padding: 0.375rem;
            border-radius: 0.5rem;
            margin-right: 0.5rem;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        .label-icon-bg-purple {
            background-color: #f3e8ff;
            padding: 0.375rem;
            border-radius: 0.5rem;
            margin-right: 0.5rem;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }

        .icon-input {
            width: 0.875rem;
            height: 0.875rem;
        }
        @media (min-width: 640px) {
            .icon-input {
                width: 1rem;
                height: 1rem;
            }
        }
        .text-blue-600 { color: #2563eb; }
        .text-green-600 { color: #059669; }
        .text-purple-600 { color: #9333ea; }

        {/* .input-with-prefix {
            padding-left: 2rem;
        } */}
        .input-prefix-icon {
            position: absolute;
            left: 0.75rem;
            top: 50%;
            transform: translateY(-50%);
            color: #9ca3af;
            font-weight: 500;
        }

        /* Live Position Card */
        .position-display-box {
            background-image: linear-gradient(to right, #eef2ff, #f5f3ff);
            padding: 1rem;
            border-radius: 0.75rem;
            border: 1px solid #c7d2fe;
        }
        @media (min-width: 640px) {
            .position-display-box {
                padding: 1.25rem; /* sm:p-5 */
            }
        }

        .flex-between-center {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 0.75rem;
        }
        @media (min-width: 640px) {
            .flex-between-center {
                margin-bottom: 1rem;
            }
        }

        .position-label {
            font-size: 0.75rem;
            font-weight: 700;
            color: #4f46e5;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        @media (min-width: 640px) {
            .position-label {
                font-size: 0.875rem;
            }
        }

        .pulse-dot {
            width: 0.625rem;
            height: 0.625rem;
            background-color: #6366f1;
            border-radius: 9999px;
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @media (min-width: 640px) {
            .pulse-dot {
                width: 0.75rem;
                height: 0.75rem;
            }
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .grid-2-col-gap {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.75rem;
        }
        @media (min-width: 640px) {
            .grid-2-col-gap {
                gap: 1rem;
            }
        }

        .position-value-card {
            background-color: white;
            padding: 0.75rem;
            border-radius: 0.5rem;
            text-align: center;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        @media (min-width: 640px) {
            .position-value-card {
                padding: 1rem;
            }
        }

        .pos-label-small {
            font-size: 0.75rem;
            color: #6b7280;
            margin-bottom: 0.25rem;
        }

        .pos-value-mono {
            font-size: 1.125rem;
            font-weight: 700;
            color: #4f46e5;
            font-family: monospace;
        }
        @media (min-width: 640px) {
            .pos-value-mono {
                font-size: 1.25rem;
            }
        }

        .position-empty-state {
            text-align: center;
            padding-top: 1.5rem;
            padding-bottom: 1.5rem;
        }
        @media (min-width: 640px) {
            .position-empty-state {
                padding-top: 2rem;
                padding-bottom: 2rem;
            }
        }

        .empty-state-icon-bg {
            background-color: #f3f4f6;
            padding: 0.75rem;
            border-radius: 9999px;
            width: 3rem;
            height: 3rem;
            margin-left: auto;
            margin-right: auto;
            margin-bottom: 0.75rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        @media (min-width: 640px) {
            .empty-state-icon-bg {
                width: 4rem;
                height: 4rem;
                margin-bottom: 1rem;
                padding: 1rem;
            }
        }

        .icon-empty-state {
            width: 1.5rem;
            height: 1.5rem;
            color: #9ca3af;
        }
        @media (min-width: 640px) {
            .icon-empty-state {
                width: 2rem;
                height: 2rem;
            }
        }

        .empty-state-text {
            font-size: 0.75rem;
            color: #4b5563;
            line-height: 1.625;
            padding-left: 0.5rem;
            padding-right: 0.5rem;
        }
        @media (min-width: 640px) {
            .empty-state-text {
                font-size: 0.875rem;
            }
        }
        .text-indigo-600-medium {
            color: #4f46e5;
            font-weight: 500;
        }

        /* Canvas Section */
        .canvas-main-section {
            width: 100%;
            order: 1; /* order-1 */
        }
        @media (min-width: 1024px) {
            .canvas-main-section {
                grid-column: span 8 / span 8; /* lg:col-span-8 */
                order: 2; /* lg:order-2 */
            }
        }
        @media (min-width: 1280px) {
            .canvas-main-section {
                grid-column: span 9 / span 9; /* xl:col-span-9 */
            }
        }

        .canvas-header-flex {
            display: flex;
            flex-direction: column;
            margin-bottom: 1rem;
        }
        .canvas-header-flex > * + * {
            margin-top: 0.75rem; /* space-y-3 */
        }
        @media (min-width: 640px) {
            .canvas-header-flex {
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 1.5rem; /* sm:mb-6 */
            }
            .canvas-header-flex > * + * {
                margin-top: 0; /* sm:space-y-0 */
            }
        }

        .btn-download {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background-image: linear-gradient(to right, #10b981, #059669);
            color: white;
            padding: 0.75rem 1rem;
            border-radius: 0.75rem;
            transition: all 0.2s ease;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            font-weight: 600;
            font-size: 0.875rem;
            border: none;
            cursor: pointer;
        }
        @media (min-width: 640px) {
            .btn-download {
                width: auto;
                padding: 0.75rem 1.5rem;
                font-size: 1rem;
            }
        }
        .btn-download:hover {
            background-image: linear-gradient(to right, #059669, #047857);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            transform: scale(1.02);
        }
        .btn-download:active {
            transform: scale(0.95);
        }
        .btn-download:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .icon-btn {
            width: 1rem;
            height: 1rem;
            margin-right: 0.5rem;
        }
        @media (min-width: 640px) {
            .icon-btn {
                width: 1.25rem;
                height: 1.25rem;
            }
        }

        /* Canvas Border/Container */
        .canvas-border {
            position: relative;
            overflow: hidden;
            border-radius: 0.75rem;
            border: 2px solid #bfdbfe; /* border-blue-200 */
            box-shadow: 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); /* shadow-md */
            transition: all 0.3s ease;
        }
        @media (min-width: 640px) {
            .canvas-border {
                border-radius: 1rem; /* sm:rounded-2xl */
                border-width: 4px; /* sm:border-4 */
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); /* sm:shadow-xl */
            }
        }

        .canvas-border.dragging {
            border-color: #f87171; /* border-red-400 */
            box-shadow: 0 10px 15px -3px rgba(254, 202, 202, 0.5); /* shadow-red-200 shadow-lg */
        }
        @media (min-width: 640px) {
            .canvas-border.dragging {
                box-shadow: 0 25px 50px -12px rgba(254, 202, 202, 0.5); /* sm:shadow-2xl */
            }
        }

        .canvas-loading-overlay {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            background-image: linear-gradient(to right, #f3f4f6, #e5e7eb);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #4b5563;
            z-index: 10;
        }

        .spinner {
            animation: spin 1s linear infinite;
            border-radius: 50%;
            height: 2rem;
            width: 2rem;
            border-bottom-width: 2px;
            border-color: #2563eb;
            margin-left: auto;
            margin-right: auto;
            margin-bottom: 0.75rem;
        }
        @media (min-width: 640px) {
            .spinner {
                height: 3rem;
                width: 3rem;
                margin-bottom: 1rem;
            }
        }

        .main-canvas {
            width: 100%;
            height: auto;
            display: block;
            background-color: white;
            transition: all 0.3s ease;
            touch-action: none; /* touch-none */
        }

        /* Canvas Footer */
        .canvas-footer {
            margin-top: 0.75rem;
            text-align: center;
        }
        @media (min-width: 640px) {
            .canvas-footer {
                margin-top: 1rem;
            }
        }

        .pro-tip-box {
            background-image: linear-gradient(to right, #f9fafb, #eff6ff);
            padding: 0.5rem 0.75rem;
            border-radius: 0.5rem;
            border: 1px solid #e5e7eb;
            display: inline-block;
        }
        @media (min-width: 640px) {
            .pro-tip-box {
                padding: 0.75rem 1rem;
            }
        }

        .text-lg { font-size: 1.125rem; }
        .text-xl { font-size: 1.25rem; }

        .hidden-mobile { display: none; }
        @media (min-width: 640px) {
            .hidden-mobile { display: inline; }
        }
        .visible-mobile { display: inline; }
        @media (min-width: 640px) {
            .visible-mobile { display: none; }
        }

        .drag-cursor { cursor: grab; }
        .drag-cursor.dragging { cursor: grabbing; }
      `}</style>
      
      {/* Header */}
      <header className="header-container">
        <div className="max-width-center">
          <div className="header-flex-center">
            <div className="header-icon-bg">
              <FileText className="icon-lg" />
            </div>
            <div className="space-y-2">
              <h1 className="header-title">
                Donation Slip Generator
              </h1>
              <div className="header-divider"></div>
            </div>
          </div>
          <p className="header-subtitle">
            Create, customize, and download professional donation receipts with our intuitive drag-and-drop editor.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="main-padding">
        <div className="max-width-center">
          <div className="main-layout">
            
            {/* MOBILE-FIRST SIDEBAR: Controls (Order 2 for small screens) */}
            <div className="sidebar-controls">
              <div className="space-y-6">
                
                {/* Template Selection Card */}
                <div className="card glass enhanced-shadow">
                  <div className="card-header">
                    <div className="icon-bg-yellow">
                      <Palette className="icon-sm" />
                    </div>
                    <h2 className="card-title">Template Selection</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="relative">
                      <select
                        value={selectedTemplateId}
                        onChange={handleTemplateChange}
                        className="form-select"
                      >
                        {TEMPLATES.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="template-info-box">
                      <div className="flex-responsive-between">
                        <p className="info-text-main">
                          <span className="text-blue-semibold">Active:</span> {selectedTemplate.name}
                        </p>
                        <p className="text-xs-gray">
                          {selectedTemplate.canvasDimensions.width} × {selectedTemplate.canvasDimensions.height}px
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slip Details Card */}
                <div className="card glass enhanced-shadow slip-details">
                  <div className="card-header">
                    <div className="icon-bg-green">
                      <FileText className="icon-sm text-white" />
                    </div>
                    <h2 className="card-title">Slip Details</h2>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Name Input */}
                    <div className="w-full">
                      <label className="form-label">
                        <div className="label-icon-bg-blue">
                          <User className="icon-input text-blue-600" />
                        </div>
                        Donor Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter donor name"
                        className="form-input"
                      />
                    </div>
                    
                    {/* Amount Input */}
                    <div className="w-full">
                      <label className="form-label">
                        <div className="label-icon-bg-green">
                          <DollarSign className="icon-input text-green-600" />
                        </div>
                        Amount
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          name="amount"
                          value={formData.amount}
                          onChange={handleInputChange}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="form-input input-with-prefix"
                        />
                      </div>
                    </div>

                    {/* Purpose Input */}
                    <div className="w-full">
                      <label className="form-label">
                        <div className="label-icon-bg-purple">
                          <PlusCircle className="icon-input text-purple-600" />
                        </div>
                        Purpose
                      </label>
                      <input
                        type="text"
                        name="purpose"
                        value={formData.purpose}
                        onChange={handleInputChange}
                        placeholder="Donation purpose or cause"
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Text Customization Card (NEW) */}
                <div className="card glass enhanced-shadow">
                    <div className="card-header">
                        <div className="icon-bg-yellow">
                            <PenTool className="icon-sm" />
                        </div>
                        <h2 className="card-title">Text Customization</h2>
                    </div>
                    <div className="space-y-4">
                        <CustomizationControls field="name" label="Name Style" />
                        <CustomizationControls field="amount" label="Amount Style" />
                        <CustomizationControls field="purpose" label="Purpose Style" />
                    </div>
                </div>

                {/* Live Position Card */}
                <div className="card glass enhanced-shadow">
                  <div className="card-header">
                    <div className="icon-bg-indigo">
                      <Move className="icon-sm text-white" />
                    </div>
                    <h2 className="card-title">Live Position</h2>
                  </div>
                  
                  {activePosition && activeField ? (
                    <div className="position-display-box">
                      <div className="flex-between-center">
                        <span className="position-label">{activeField}</span>
                        <div className="pulse-dot"></div>
                      </div>
                      <div className="grid-2-col-gap">
                        <div className="position-value-card">
                          <p className="pos-label-small">X Position</p>
                          <p className="pos-value-mono">{activePosition.x}</p>
                        </div>
                        <div className="position-value-card">
                          <p className="pos-label-small">Y Position</p>
                          <p className="pos-value-mono">{activePosition.y}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="position-empty-state">
                      <div className="empty-state-icon-bg">
                        <Move className="icon-empty-state" />
                      </div>
                      <p className="empty-state-text">
                        Click/Tap and drag text elements on the canvas to adjust their positions.
                        <br className="hidden-mobile" />
                        <span className="text-indigo-600-medium">Selected elements will be highlighted.</span>
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* MAIN CANVAS SECTION (Order 1 for small screens) */}
            <div className="canvas-main-section">
              <div className="card glass enhanced-shadow">
                {/* Canvas Header */}
                <div className="canvas-header-flex">
                  <div className="flex items-center">
                    <div className="icon-bg-indigo">
                      <span className="pulse-dot bg-white block w-2.5 h-2.5 sm:w-3 sm:h-3"></span>
                    </div>
                    <h2 className="card-title">Rendered Slip</h2>
                  </div>
                  
                  <button
                    onClick={handleDownload}
                    disabled={imageLoading}
                    className="btn-download"
                  >
                    <Download className="icon-btn" />
                    Download PNG
                  </button>
                </div>

                {/* Canvas Container */}
                <div className={`canvas-border ${isDragging ? 'dragging' : ''}`}>
                  {imageLoading && (
                    <div className="canvas-loading-overlay">
                      <div className="text-center p-4">
                        <div className="spinner"></div>
                        <p className="font-medium text-sm sm:text-base">Loading template image...</p>
                      </div>
                    </div>
                  )}
                  
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    // Touch events for full mobile drag support
                    onTouchStart={(e) => {
                      e.preventDefault();
                      const touch = e.touches[0];
                      const mouseEvent = new MouseEvent('mousedown', {
                        clientX: touch.clientX,
                        clientY: touch.clientY
                      });
                      handleMouseDown(mouseEvent);
                    }}
                    onTouchMove={(e) => {
                      e.preventDefault();
                      const touch = e.touches[0];
                      const mouseEvent = new MouseEvent('mousemove', {
                        clientX: touch.clientX,
                        clientY: touch.clientY
                      });
                      handleMouseMove(mouseEvent);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleMouseUp();
                    }}
                    className={`main-canvas ${isDragging ? 'dragging' : ''} ${isDragging ? 'drag-cursor dragging' : 'drag-cursor'}`}
                    width={selectedTemplate.canvasDimensions.width}
                    height={selectedTemplate.canvasDimensions.height}
                    style={{ 
                      aspectRatio: `${selectedTemplate.canvasDimensions.width}/${selectedTemplate.canvasDimensions.height}`,
                      maxHeight: '70vh', 
                      minHeight: '200px'
                    }}
                  />
                </div>
                
                {/* Canvas Footer */}
                <div className="canvas-footer">
                  <div className="pro-tip-box">
                    <p className="text-xs sm:text-sm text-gray-600">
                      <span className="text-lg sm:text-xl">💡</span>
                      <span className="font-medium ml-1">Pro Tip:</span>
                      <span className="hidden-mobile"> Click and drag text elements to reposition them on your template</span>
                      <span className="visible-mobile"> Tap and drag text to reposition</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
