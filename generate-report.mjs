import {
  Document, Packer, Paragraph, Table, TableCell, TableRow,
  TextRun, HeadingLevel, AlignmentType, WidthType, ShadingType,
  BorderStyle, TableLayoutType, VerticalAlign, PageBreak,
  Header as DocHeader, Footer as DocFooter, ImageRun,
  ExternalHyperlink, UnderlineType, convertInchesToTwip
} from 'docx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Colour Palette ───────────────────────────────────────────────────────────
const C = {
  amber:    'B45309',  // amber-700
  amberLt:  'FEF3C7',  // amber-50
  stone900: '1C1917',
  stone700: '44403C',
  stone500: '78716C',
  stone200: 'E7E5E4',
  stone100: 'F5F5F4',
  white:    'FFFFFF',
  red:      'DC2626',
  redLt:    'FEF2F2',
  orange:   'EA580C',
  orangeLt: 'FFF7ED',
  green:    '16A34A',
  greenLt:  'F0FDF4',
  yellow:   'CA8A04',
  yellowLt: 'FEFCE8',
  blue:     '2563EB',
  blueLt:   'EFF6FF',
};

// ─── Helper: make a plain text run ───────────────────────────────────────────
const txt = (text, opts = {}) =>
  new TextRun({ text, font: 'Calibri', size: 22, color: C.stone700, ...opts });

// ─── Helper: Section Heading ─────────────────────────────────────────────────
const sectionH = (text) =>
  new Paragraph({
    children: [
      new TextRun({
        text: text.toUpperCase(),
        font: 'Calibri',
        size: 28,
        bold: true,
        color: C.stone900,
      }),
    ],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 400, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.amber } },
  });

// ─── Helper: Sub-heading ─────────────────────────────────────────────────────
const subH = (text, color = C.stone900) =>
  new Paragraph({
    children: [new TextRun({ text, font: 'Calibri', size: 24, bold: true, color })],
    spacing: { before: 240, after: 80 },
  });

// ─── Helper: Body paragraph ──────────────────────────────────────────────────
const body = (text, opts = {}) =>
  new Paragraph({
    children: [txt(text, opts)],
    spacing: { after: 100 },
  });

// ─── Helper: Bullet ──────────────────────────────────────────────────────────
const bullet = (text, level = 0) =>
  new Paragraph({
    children: [txt(text)],
    bullet: { level },
    spacing: { after: 60 },
  });

// ─── Helper: Coloured Badge row (status pill) ────────────────────────────────
const statusCell = (text, bg, fg = C.white) =>
  new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, font: 'Calibri', size: 18, bold: true, color: fg })],
        alignment: AlignmentType.CENTER,
      }),
    ],
    shading: { type: ShadingType.SOLID, fill: bg },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
  });

// ─── Helper: Plain table cell ────────────────────────────────────────────────
const cell = (text, { bold = false, bg = C.white, fg = C.stone700, align = AlignmentType.LEFT, size = 20 } = {}) =>
  new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, font: 'Calibri', size, bold, color: fg })],
        alignment: align,
      }),
    ],
    shading: { type: ShadingType.SOLID, fill: bg },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
  });

// ─── Helper: Table header row ────────────────────────────────────────────────
const headerRow = (cols) =>
  new TableRow({
    children: cols.map(c =>
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: c, font: 'Calibri', size: 20, bold: true, color: C.white })],
          }),
        ],
        shading: { type: ShadingType.SOLID, fill: C.stone900 },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
      })
    ),
    tableHeader: true,
  });

// ─── Helper: divider paragraph ───────────────────────────────────────────────
const divider = () =>
  new Paragraph({
    children: [],
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.stone200 } },
  });

// ─── Helper: code-style paragraph ────────────────────────────────────────────
const code = (text) =>
  new Paragraph({
    children: [new TextRun({ text, font: 'Courier New', size: 18, color: C.amber })],
    shading: { type: ShadingType.SOLID, fill: C.stone100 },
    spacing: { after: 80 },
    indent: { left: 360 },
  });

const spacer = (lines = 1) =>
  new Paragraph({ children: [new TextRun('')], spacing: { after: lines * 120 } });

// ═════════════════════════════════════════════════════════════════════════════
//  BUILD DOCUMENT
// ═════════════════════════════════════════════════════════════════════════════
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Calibri', size: 22, color: C.stone700 },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.1),
            right: convertInchesToTwip(1.1),
          },
        },
      },

      // ── Page Header ─────────────────────────────────────────────────────
      headers: {
        default: new DocHeader({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'EXOTIQUE MACHINES', font: 'Calibri', size: 18, bold: true, color: C.amber }),
                new TextRun({ text: '  |  Project Audit Report  |  October 2026', font: 'Calibri', size: 18, color: C.stone500 }),
              ],
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.stone200 } },
            }),
          ],
        }),
      },

      // ── Page Footer ──────────────────────────────────────────────────────
      footers: {
        default: new DocFooter({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'Confidential — Exotique Machines (Sai Baba Car Sales Pvt Ltd)  •  Lucknow', font: 'Calibri', size: 16, color: C.stone500 }),
              ],
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.stone200 } },
            }),
          ],
        }),
      },

      children: [

        // ─────────────────────────────────────────────────────────────────
        //  COVER / TITLE BLOCK
        // ─────────────────────────────────────────────────────────────────
        new Paragraph({
          children: [new TextRun({ text: '', font: 'Calibri' })],
          spacing: { after: 480 },
        }),

        new Paragraph({
          children: [
            new TextRun({ text: 'EXOTIQUE MACHINES', font: 'Calibri', size: 56, bold: true, color: C.stone900 }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'A UNIT OF SAI BABA CAR SALES PVT LTD', font: 'Calibri', size: 22, bold: true, color: C.amber }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'PROJECT AUDIT & COMPLETION REPORT', font: 'Calibri', size: 36, bold: true, color: C.stone900 }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Platform: Luxura Web Application  |  Date: October 25, 2026', font: 'Calibri', size: 22, color: C.stone500 }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Auditor: Antigravity AI System', font: 'Calibri', size: 22, color: C.stone500, italics: true }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 480 },
        }),

        divider(),

        // ─────────────────────────────────────────────────────────────────
        //  EXECUTIVE SUMMARY
        // ─────────────────────────────────────────────────────────────────
        sectionH('1. Executive Summary'),

        body('The Exotique Machines website (codenamed "Luxura") is a full-stack luxury automobile dealership platform built with React 19, TypeScript, Vite, Express.js, and Tailwind CSS v4. This report evaluates the current state of every module, documents flaws found during the audit, and provides a prioritised action plan.'),
        spacer(),

        new Paragraph({
          children: [
            new TextRun({ text: 'Overall Project Completion: ', font: 'Calibri', size: 26, bold: true, color: C.stone900 }),
            new TextRun({ text: '~80%', font: 'Calibri', size: 32, bold: true, color: C.amber }),
          ],
          spacing: { after: 200 },
        }),

        // ─────────────────────────────────────────────────────────────────
        //  MODULE COMPLETION TABLE
        // ─────────────────────────────────────────────────────────────────
        sectionH('2. Module Completion Status'),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          rows: [
            headerRow(['Module', 'Status', 'Completion %']),
            new TableRow({ children: [cell('Homepage (HomeView)'), statusCell('✓ COMPLETE', C.green), cell('95%', { bold: true, align: AlignmentType.CENTER })] }),
            new TableRow({ children: [cell('Inventory / Catalog'), statusCell('✓ COMPLETE', C.green), cell('90%', { bold: true, align: AlignmentType.CENTER })] }),
            new TableRow({ children: [cell('Vehicle Detail Page'), statusCell('✓ COMPLETE', C.green), cell('88%', { bold: true, align: AlignmentType.CENTER })] }),
            new TableRow({ children: [cell('Finance Calculator'), statusCell('✓ COMPLETE', C.green), cell('85%', { bold: true, align: AlignmentType.CENTER })] }),
            new TableRow({ children: [cell('Test Drive Booking'), statusCell('⚠ PARTIAL', C.yellow, C.stone900), cell('70%', { bold: true, align: AlignmentType.CENTER })] }),
            new TableRow({ children: [cell('Service Booking'), statusCell('✓ COMPLETE', C.green), cell('85%', { bold: true, align: AlignmentType.CENTER })] }),
            new TableRow({ children: [cell('Trade-In Estimator'), statusCell('⚠ PARTIAL', C.yellow, C.stone900), cell('72%', { bold: true, align: AlignmentType.CENTER })] }),
            new TableRow({ children: [cell('Offers & Deals'), statusCell('⚠ PARTIAL', C.yellow, C.stone900), cell('65%', { bold: true, align: AlignmentType.CENTER })] }),
            new TableRow({ children: [cell('Admin Portal'), statusCell('✓ COMPLETE', C.green), cell('92%', { bold: true, align: AlignmentType.CENTER })] }),
            new TableRow({ children: [cell('Backend API Server'), statusCell('✓ COMPLETE', C.green), cell('88%', { bold: true, align: AlignmentType.CENTER })] }),
            new TableRow({ children: [cell('Hostinger Deployment'), statusCell('✓ FIXED TODAY', C.amber), cell('75%', { bold: true, align: AlignmentType.CENTER })] }),
            new TableRow({ children: [cell('SEO / Meta Tags'), statusCell('✗ MISSING', C.red), cell('20%', { bold: true, align: AlignmentType.CENTER })] }),
            new TableRow({ children: [cell('Email / WhatsApp Integration'), statusCell('✗ MISSING', C.red), cell('0%', { bold: true, align: AlignmentType.CENTER })] }),
          ],
        }),

        spacer(2),

        // ─────────────────────────────────────────────────────────────────
        //  STRENGTHS
        // ─────────────────────────────────────────────────────────────────
        sectionH('3. What Is Working Well (Strengths)'),

        subH('3.1  Homepage', C.green),
        bullet('Multi-vehicle hero slider with smooth fade/scale animations'),
        bullet('ZoomParallax scroll section — premium cinematic visual experience'),
        bullet('FlowingMenu branded navigation overlay'),
        bullet('LogoCarousel — animated brand logos (Mercedes, BMW, Land Rover, Toyota)'),
        bullet('CircularTestimonials with Unsplash portrait photos'),
        bullet('CardStack for featured vehicles'),
        bullet('Mobile-responsive bottom sticky navigation bar'),
        bullet('Search filters: Brand, Budget, Fuel, Transmission'),
        spacer(),

        subH('3.2  Inventory / Catalog Page', C.green),
        bullet('Filter system: Brand, Segment (Premium / Non-Premium), Budget Slider, Fuel, Transmission'),
        bullet('Real-time search with 300 ms debounce — no lag'),
        bullet('Vehicle comparison drawer (up to 3 vehicles side-by-side)'),
        bullet('Sort by: Popularity, Price, Mileage, Rating'),
        bullet('Skeleton loading placeholders for premium perceived performance'),
        bullet('Favorites (heart) toggle persisted in localStorage'),
        bullet('Responsive grid + sidebar layout across all screen sizes'),
        spacer(),

        subH('3.3  Vehicle Details Page', C.green),
        bullet('Multi-image gallery with keyboard arrow-key navigation'),
        bullet('360° rotation mode using uploaded car images'),
        bullet('Color selector swatch UI'),
        bullet('Engine specs, power, mileage, features list'),
        bullet('Inline quick enquiry form on the page'),
        bullet('"Book Test Drive" and "Apply for Finance" CTA buttons'),
        bullet('Share + Favorite buttons'),
        spacer(),

        subH('3.4  Finance Calculator', C.green),
        bullet('EMI calculator with interactive sliders: Loan Amount, Interest Rate, Tenure'),
        bullet('Auto-populates loan amount from selected vehicle price (85% LTV assumption)'),
        bullet('Total cost + total interest breakdown displayed'),
        bullet('Finance application form generating reference number'),
        bullet('FAQ accordion section for common queries'),
        bullet('WhatsApp updates opt-in toggle'),
        spacer(),

        subH('3.5  Admin Portal (Most Complete Module)', C.green),
        bullet('Multi-tab interface: Dashboard, Vehicles, Admins, Roles, Logs, Account'),
        bullet('Full CRUD for vehicles — Add, Edit, Delete with multi-photo upload'),
        bullet('Role-Based Access Control (RBAC): SuperAdmin vs Admin roles'),
        bullet('Granular Permissions: inventory:view, inventory:create, inventory:edit, inventory:delete, pricing:edit, logs:view'),
        bullet('Brute Force Protection: 5 failed attempts triggers 15-minute lockout'),
        bullet('Activity Audit Logs: Full log of admin actions with IP address tracking'),
        bullet('Forced Password Change on first login for newly created admins'),
        bullet('Admin Account Management: SuperAdmin can create, edit, deactivate, delete accounts'),
        bullet('Live JWT authentication with token-based session management'),
        spacer(),

        subH('3.6  Backend API Server', C.green),
        bullet('Express.js REST API with proper route separation'),
        bullet('bcrypt password hashing — industry standard'),
        bullet('JWT auth middleware with live database user status check'),
        bullet('Atomic JSON file writes — prevents data corruption on crash'),
        bullet('Multer file upload with 15 MB per-file limit, type validation'),
        bullet('Activity logging with 1,000 log rolling retention'),
        bullet('CORS configured'),
        spacer(2),

        // ─────────────────────────────────────────────────────────────────
        //  FLAWS — CRITICAL
        // ─────────────────────────────────────────────────────────────────
        sectionH('4. Flaws & Issues Found'),

        subH('4.1  CRITICAL ISSUES (Must Fix Immediately)', C.red),
        spacer(),

        // Issue 1
        new Paragraph({
          children: [
            new TextRun({ text: '❶  Images Showing Black on Hostinger  ', font: 'Calibri', size: 24, bold: true, color: C.red }),
            new TextRun({ text: '— STATUS: FIXED TODAY ✓', font: 'Calibri', size: 20, bold: true, color: C.green }),
          ],
          spacing: { after: 80 },
        }),
        body('Root Cause: server/uploads/ folder was not included in the dist/ build output. Hostinger (static hosting) had no backend running, so /uploads/image.jpg requests returned 404, displaying black boxes.'),
        body('Fix Applied: Created build-hostinger.js script that automatically copies all 75 car images into dist/uploads/ before deployment.'),
        spacer(),

        // Issue 2
        new Paragraph({
          children: [new TextRun({ text: '❷  Enquiry Form Does NOT Send Data to Anyone', font: 'Calibri', size: 24, bold: true, color: C.red })],
          spacing: { after: 80 },
        }),
        body('File: src/App.tsx — handleEnquirySubmit function (Line 216-231)'),
        body('Problem: The "Enquire Now" form only generates a random fake reference number (LXM-ENQ-XXXX) locally and shows a success message. No data is saved to the database. No email is sent. No WhatsApp message is triggered. Customer leads are silently lost.'),
        code('// Current broken code:'),
        code('const ref = `LXM-ENQ-${Math.floor(1000 + Math.random() * 9000)}`;'),
        code('setEnquirySuccess(true); // Nothing is actually sent anywhere!'),
        body('Fix Required: Connect form to backend /api/enquiries endpoint OR integrate WhatsApp Business API to send customer details to the sales team.'),
        spacer(),

        // Issue 3
        new Paragraph({
          children: [new TextRun({ text: '❸  Test Drive Dates are Hardcoded', font: 'Calibri', size: 24, bold: true, color: C.red })],
          spacing: { after: 80 },
        }),
        body('File: src/components/TestDriveView.tsx — Line 45-50'),
        body('Problem: Available booking dates are hardcoded as July 8, 9, 10, 11. These dates never change — customers always see July 2025 dates regardless of the actual current date.'),
        code("const availableDates = ["),
        code("  { day: 'Wed', num: '08', month: 'Jul' },  // Always July!"),
        code("  { day: 'Thu', num: '09', month: 'Jul' },"),
        code("];"),
        body('Fix Required: Generate dates dynamically using new Date() — show next 7 days from today.'),
        spacer(),

        // Issue 4
        new Paragraph({
          children: [new TextRun({ text: '❹  Bookings Saved Only in Browser — Admin Cannot See Them', font: 'Calibri', size: 24, bold: true, color: C.red })],
          spacing: { after: 80 },
        }),
        body('Files: TestDriveView.tsx, FinanceView.tsx, ServiceView.tsx'),
        body('Problem: All customer bookings (test drives, finance applications, service bookings) are stored ONLY in localStorage in the customer\'s browser. This means: (1) Data is lost when user clears browser history, (2) Admin staff cannot see any bookings in the admin portal, (3) No way to manage or confirm appointments.'),
        body('Fix Required: POST bookings to backend API (/api/bookings, /api/finance-applications, /api/service-requests) and display them in the Admin Dashboard.'),
        spacer(),

        // Issue 5
        new Paragraph({
          children: [new TextRun({ text: '❺  No SEO Meta Tags — Website Will Not Rank on Google', font: 'Calibri', size: 24, bold: true, color: C.red })],
          spacing: { after: 80 },
        }),
        body('File: index.html'),
        body('Problem: The website has no <meta name="description">, no Open Graph tags (og:title, og:image, og:description), and no JSON-LD structured data for a car dealership. Google cannot properly index or display this website in search results for "luxury cars Lucknow" or "BMW pre-owned Lucknow".'),
        spacer(2),

        // ── MEDIUM ──────────────────────────────────────────────────────
        subH('4.2  MEDIUM ISSUES', C.orange),
        spacer(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            headerRow(['#', 'Issue', 'File', 'Impact']),
            new TableRow({ children: [
              cell('6', { bold: true }),
              cell('Loyalty eligibility check is random — last digit of phone even = eligible'),
              cell('OffersView.tsx L49-52'),
              statusCell('Fake Logic', C.orange),
            ]}),
            new TableRow({ children: [
              cell('7', { bold: true }),
              cell('Offer countdown timer resets on every page refresh — hardcoded starting values'),
              cell('OffersView.tsx L11-16'),
              statusCell('Wrong UX', C.orange),
            ]}),
            new TableRow({ children: [
              cell('8', { bold: true }),
              cell('Trade-In only supports 5 brands — no Audi, Volvo, Porsche etc.'),
              cell('TradeInView.tsx L27-33'),
              statusCell('Incomplete', C.yellow, C.stone900),
            ]}),
            new TableRow({ children: [
              cell('9', { bold: true }),
              cell('any TypeScript types used for bookings state — defeats type safety'),
              cell('App.tsx L98-123'),
              statusCell('Code Quality', C.yellow, C.stone900),
            ]}),
            new TableRow({ children: [
              cell('10', { bold: true }),
              cell('JWT fallback secret hardcoded in source code if .env not set'),
              cell('server/index.js L15'),
              statusCell('Security Risk', C.red),
            ]}),
            new TableRow({ children: [
              cell('11', { bold: true }),
              cell('Admin portal accessible to all visitors via lock icon — no route protection'),
              cell('Header.tsx L106-117'),
              statusCell('Visibility', C.orange),
            ]}),
            new TableRow({ children: [
              cell('12', { bold: true }),
              cell('No input sanitization on vehicle description — potential XSS risk'),
              cell('server/index.js'),
              statusCell('Security', C.orange),
            ]}),
          ],
        }),

        spacer(2),

        // ── MINOR ───────────────────────────────────────────────────────
        subH('4.3  MINOR ISSUES', C.yellow),
        spacer(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            headerRow(['#', 'Issue', 'Affected Area']),
            new TableRow({ children: [cell('13'), cell('Testimonials show foreign names (David Lee, Maria Gonzalez) — not Indian customer names'), cell('HomeView.tsx')] }),
            new TableRow({ children: [cell('14'), cell('console.warn() calls visible in production browser DevTools'), cell('api.ts, App.tsx')] }),
            new TableRow({ children: [cell('15'), cell('Vehicle gallery images missing descriptive alt text — bad for accessibility & SEO'), cell('VehicleDetailsView.tsx')] }),
            new TableRow({ children: [cell('16'), cell('No 404 Not Found page — unknown URLs silently redirect to homepage'), cell('Routing')] }),
            new TableRow({ children: [cell('17'), cell('Mobile nav "Locations" button goes to Service page — no actual map/location page'), cell('App.tsx L385-395')] }),
            new TableRow({ children: [cell('18'), cell('Main JS bundle is 483 KB (128 KB gzipped) — could be split further for faster load'), cell('dist/assets/')] }),
          ],
        }),

        spacer(2),

        // ─────────────────────────────────────────────────────────────────
        //  ARCHITECTURE
        // ─────────────────────────────────────────────────────────────────
        sectionH('5. Project Architecture Overview'),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            headerRow(['File / Folder', 'Purpose', 'Size']),
            new TableRow({ children: [cell('src/App.tsx', {bold:true}), cell('Root router + global state management'), cell('547 lines')] }),
            new TableRow({ children: [cell('src/data.ts', {bold:true}), cell('Static vehicle database — all car listings'), cell('3,436 lines (130 KB)')] }),
            new TableRow({ children: [cell('src/types.ts', {bold:true}), cell('TypeScript type definitions'), cell('108 lines')] }),
            new TableRow({ children: [cell('src/services/api.ts', {bold:true}), cell('Frontend API client with static fallback'), cell('283 lines')] }),
            new TableRow({ children: [cell('components/AdminPortalView.tsx', {bold:true}), cell('Full admin portal — RBAC, CRUD, logs'), cell('2,582 lines (127 KB)')] }),
            new TableRow({ children: [cell('components/HomeView.tsx', {bold:true}), cell('Homepage with animations'), cell('803 lines')] }),
            new TableRow({ children: [cell('components/InventoryView.tsx', {bold:true}), cell('Full catalog with filters & comparison'), cell('1,098 lines')] }),
            new TableRow({ children: [cell('components/VehicleDetailsView.tsx', {bold:true}), cell('Car detail page with gallery'), cell('539 lines')] }),
            new TableRow({ children: [cell('components/FinanceView.tsx', {bold:true}), cell('EMI calculator + application form'), cell('428 lines')] }),
            new TableRow({ children: [cell('components/TestDriveView.tsx', {bold:true}), cell('3-step booking wizard'), cell('443 lines')] }),
            new TableRow({ children: [cell('components/TradeInView.tsx', {bold:true}), cell('Trade-in estimator'), cell('400 lines')] }),
            new TableRow({ children: [cell('server/index.js', {bold:true}), cell('Express REST API — auth, CRUD, uploads'), cell('1,152 lines')] }),
            new TableRow({ children: [cell('server/uploads/', {bold:true}), cell('Uploaded car images'), cell('75 images')] }),
            new TableRow({ children: [cell('public/.htaccess', {bold:true}), cell('Hostinger SPA routing fix'), cell('10 lines')] }),
          ],
        }),

        spacer(2),

        // ─────────────────────────────────────────────────────────────────
        //  INCOMPLETE FEATURES
        // ─────────────────────────────────────────────────────────────────
        sectionH('6. Features That Need to Be Built'),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            headerRow(['Feature', 'Priority', 'Estimated Effort']),
            new TableRow({ children: [cell('Real enquiry form — WhatsApp API or email submission'), statusCell('HIGH', C.red), cell('Medium (2-3 days)')] }),
            new TableRow({ children: [cell('Dynamic test drive date picker (next 7 days from today)'), statusCell('HIGH', C.red), cell('Low (2 hours)')] }),
            new TableRow({ children: [cell('Save customer bookings to backend database'), statusCell('HIGH', C.red), cell('High (1 week)')] }),
            new TableRow({ children: [cell('SEO meta tags + Open Graph + JSON-LD structured data'), statusCell('HIGH', C.orange), cell('Low (4 hours)')] }),
            new TableRow({ children: [cell('Admin dashboard showing customer bookings'), statusCell('HIGH', C.orange), cell('High (1 week)')] }),
            new TableRow({ children: [cell('Real loyalty eligibility check or remove feature'), statusCell('MEDIUM', C.yellow, C.stone900), cell('Medium (1 day)')] }),
            new TableRow({ children: [cell('Countdown timer linked to real offer end date'), statusCell('MEDIUM', C.yellow, C.stone900), cell('Low (1 hour)')] }),
            new TableRow({ children: [cell('Google Maps embed for showroom location'), statusCell('LOW', C.stone200, C.stone700), cell('Low (1 hour)')] }),
            new TableRow({ children: [cell('Replace fake testimonials with real customer reviews'), statusCell('LOW', C.stone200, C.stone700), cell('Low (2 hours)')] }),
            new TableRow({ children: [cell('Bundle code-splitting for faster page load'), statusCell('LOW', C.stone200, C.stone700), cell('Medium (1 day)')] }),
          ],
        }),

        spacer(2),

        // ─────────────────────────────────────────────────────────────────
        //  ACTION PLAN
        // ─────────────────────────────────────────────────────────────────
        sectionH('7. Prioritised Action Plan'),

        subH('🔴  Immediately (This Week)', C.red),
        bullet('Fix enquiry form — connect to WhatsApp Business API or send email via backend'),
        bullet('Fix test drive date picker — generate next 7 days dynamically from new Date()'),
        bullet('Add SEO meta tags to index.html — title, description, Open Graph'),
        bullet('Configure JWT secret properly via environment variable only — remove fallback'),
        spacer(),

        subH('🟠  This Month', C.orange),
        bullet('Save all bookings (test drive, service, finance) to backend database'),
        bullet('Display customer bookings in Admin Dashboard'),
        bullet('Fix loyalty eligibility or remove the feature entirely'),
        bullet('Fix offer countdown timer to reference a real end date'),
        bullet('Fix TypeScript any types — use proper interfaces'),
        spacer(),

        subH('🟡  Later (Nice to Have)', C.yellow),
        bullet('Replace foreign testimonial names & photos with real Indian customer data'),
        bullet('Add Google Maps embed for showroom location'),
        bullet('Remove console.warn statements from production'),
        bullet('Add proper alt text to all vehicle images'),
        bullet('Implement bundle code-splitting for faster initial load time'),
        bullet('Create a proper 404 page'),
        spacer(2),

        divider(),

        // ─────────────────────────────────────────────────────────────────
        //  FOOTER NOTE
        // ─────────────────────────────────────────────────────────────────
        new Paragraph({
          children: [
            new TextRun({ text: 'Report prepared by Antigravity AI  •  ', font: 'Calibri', size: 18, color: C.stone500, italics: true }),
            new TextRun({ text: 'October 25, 2026  •  ', font: 'Calibri', size: 18, color: C.stone500, italics: true }),
            new TextRun({ text: 'Exotique Machines — Luxura Platform Audit', font: 'Calibri', size: 18, color: C.stone500, italics: true }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
        }),
      ],
    },
  ],
});

// ─── Write to file ────────────────────────────────────────────────────────────
const outPath = path.join(__dirname, 'Exotique_Machines_Project_Audit_Report.docx');
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outPath, buffer);
  console.log('✅ Report generated successfully!');
  console.log('📄 File: ' + outPath);
}).catch(err => {
  console.error('❌ Error generating report:', err);
  process.exit(1);
});
