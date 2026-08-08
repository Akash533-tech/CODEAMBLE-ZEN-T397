import pool from './pool';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { calculateHash, mineBlock } from '../services/blockchain';
import dotenv from 'dotenv';
dotenv.config();

async function seed() {
  console.log('\n==================== SEEDING DATABASE ====================\n');

  // =============== OFFICERS ===============
  const officerCredentials = [
    { officer_id: 'GOV-ADM-001', name: 'Dr. Anil Kumar', designation: 'Director General', department: 'MoEFCC Carbon Division', role: 'admin', password: 'Admin@123' },
    { officer_id: 'GOV-REV-002', name: 'Sh. Rajesh Verma', designation: 'Senior Reviewer', department: 'Carbon Credits Cell', role: 'reviewer', password: 'Review@123' },
  ];
  const officerIds: string[] = [];
  for (const o of officerCredentials) {
    const hash = await bcrypt.hash(o.password, 12);
    const res = await pool.query(
      `INSERT INTO government_officers (officer_id, name, designation, department, password_hash, role)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (officer_id) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
      [o.officer_id, o.name, o.designation, o.department, hash, o.role]
    );
    officerIds.push(res.rows[0].id);
  }

  // =============== COMPANIES ===============
  const companyCredentials = [
    { cin: 'L27100MH1907PLC000260', name: 'Tata Steel Ltd', email: 'carbon@tatasteel.com', phone: '9876543210', sector: 'Manufacturing', state: 'Maharashtra', password: 'TataSteel@123' },
    { cin: 'L17110MH1973PLC019786', name: 'Reliance Industries', email: 'sustainability@ril.com', phone: '9876543211', sector: 'Energy', state: 'Gujarat', password: 'Reliance@123' },
    { cin: 'L85110KA1981PLC013115', name: 'Infosys Ltd', email: 'green@infosys.com', phone: '9876543212', sector: 'Technology', state: 'Karnataka', password: 'Infosys@123' },
    { cin: 'L65990MH1945PLC004558', name: 'Mahindra Group', email: 'carbon@mahindra.com', phone: '9876543213', sector: 'Automotive', state: 'Maharashtra', password: 'Mahindra@123' },
    { cin: 'L40106GJ2015PLC082007', name: 'Adani Green Energy', email: 'credits@adanigreen.com', phone: '9876543214', sector: 'Energy', state: 'Gujarat', password: 'Adani@123' },
    { cin: 'L15491WB1918PLC002933', name: 'ITC Limited', email: 'green@itc.in', phone: '9876543215', sector: 'FMCG', state: 'West Bengal', password: 'ITC@12345' },
    { cin: 'L31502GJ1956PLC001076', name: 'L&T Limited', email: 'sustainability@lnt.com', phone: '9876543216', sector: 'Infrastructure', state: 'Maharashtra', password: 'LnT@12345' },
    { cin: 'L24239MH1947PLC005428', name: 'Hindalco Industries', email: 'carbon@hindalco.com', phone: '9876543217', sector: 'Metals', state: 'Maharashtra', password: 'Hindalco@123' },
    { cin: 'L05005MH1951PLC008809', name: 'ONGC Ltd', email: 'environment@ongc.co.in', phone: '9876543218', sector: 'Energy', state: 'Gujarat', password: 'ONGC@12345' },
    { cin: 'L01100TN1977PLC007193', name: 'Ashok Leyland', email: 'green@ashokleyland.com', phone: '9876543219', sector: 'Automotive', state: 'Tamil Nadu', password: 'Ashok@12345' },
  ];
  const companyIds: string[] = [];
  const companyMap: Record<string, {id: string; email: string; cin: string}> = {};
  for (const c of companyCredentials) {
    const hash = await bcrypt.hash(c.password, 12);
    const res = await pool.query(
      `INSERT INTO companies (cin, name, contact_email, contact_phone, password_hash, is_verified, registered_address)
       VALUES ($1,$2,$3,$4,$5,true,$6)
       ON CONFLICT (cin) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
      [c.cin, c.name, c.email, c.phone, hash, `${c.state}, India`]
    );
    companyIds.push(res.rows[0].id);
    companyMap[c.cin] = { id: res.rows[0].id, email: c.email, cin: c.cin };
  }

  // =============== LAND PARCELS ===============
  const lands = [
    { land_id: 'LND-MH-0001234', state: 'Maharashtra', district: 'Pune', area: 450, type: 'forest', species: ['Teak','Bamboo','Neem'], credits: 12500, avail: 8300, price: 850, ndvi: 0.72 },
    { land_id: 'LND-KA-0002345', state: 'Karnataka', district: 'Coorg', area: 320, type: 'forest', species: ['Sandalwood','Rosewood','Silver Oak'], credits: 9800, avail: 6700, price: 920, ndvi: 0.81 },
    { land_id: 'LND-KL-0003456', state: 'Kerala', district: 'Wayanad', area: 280, type: 'wetland', species: ['Mangrove','Coconut Palm'], credits: 7600, avail: 4800, price: 780, ndvi: 0.68 },
    { land_id: 'LND-RJ-0004567', state: 'Rajasthan', district: 'Udaipur', area: 580, type: 'grassland', species: ['Babool','Khejri','Neem'], credits: 6200, avail: 4700, price: 650, ndvi: 0.45 },
    { land_id: 'LND-TN-0005678', state: 'Tamil Nadu', district: 'Nilgiris', area: 210, type: 'forest', species: ['Eucalyptus','Pine','Shola'], credits: 11200, avail: 5600, price: 980, ndvi: 0.88 },
    { land_id: 'LND-MP-0006789', state: 'Madhya Pradesh', district: 'Hoshangabad', area: 420, type: 'forest', species: ['Sal','Teak','Bamboo'], credits: 8900, avail: 6700, price: 720, ndvi: 0.65 },
    { land_id: 'LND-GJ-0007890', state: 'Gujarat', district: 'Dang', area: 350, type: 'forest', species: ['Teak','Bamboo','Mango'], credits: 7400, avail: 3600, price: 810, ndvi: 0.61 },
    { land_id: 'LND-UP-0008901', state: 'Uttar Pradesh', district: 'Gorakhpur', area: 600, type: 'agricultural', species: ['Mango','Neem','Peepal'], credits: 5800, avail: 4600, price: 580, ndvi: 0.52 },
    { land_id: 'LND-WB-0009012', state: 'West Bengal', district: 'Sundarbans', area: 380, type: 'wetland', species: ['Mangrove','Sundari','Gewa'], credits: 14200, avail: 7400, price: 1050, ndvi: 0.91 },
    { land_id: 'LND-HP-0010123', state: 'Himachal Pradesh', district: 'Kullu', area: 190, type: 'forest', species: ['Deodar','Pine','Oak'], credits: 6100, avail: 4200, price: 890, ndvi: 0.77 },
    { land_id: 'LND-AS-0011234', state: 'Assam', district: 'Kaziranga', area: 520, type: 'grassland', species: ['Bamboo','Elephant Grass','Sal'], credits: 8500, avail: 5900, price: 700, ndvi: 0.58 },
    { land_id: 'LND-GA-0012345', state: 'Goa', district: 'South Goa', area: 140, type: 'wetland', species: ['Mangrove','Coconut','Cashew'], credits: 4200, avail: 2400, price: 960, ndvi: 0.76 },
    { land_id: 'LND-OR-0013456', state: 'Odisha', district: 'Simlipal', area: 480, type: 'forest', species: ['Sal','Bamboo','Teak','Mahua'], credits: 10300, avail: 6200, price: 760, ndvi: 0.71 },
    { land_id: 'LND-UK-0014567', state: 'Uttarakhand', district: 'Dehradun', area: 260, type: 'forest', species: ['Deodar','Chir Pine','Oak','Rhododendron'], credits: 7800, avail: 4600, price: 870, ndvi: 0.83 },
    { land_id: 'LND-CG-0015678', state: 'Chhattisgarh', district: 'Bastar', area: 650, type: 'forest', species: ['Sal','Teak','Bamboo','Tendu'], credits: 13500, avail: 10000, price: 680, ndvi: 0.69 },
    { land_id: 'LND-JH-0016789', state: 'Jharkhand', district: 'Ranchi', area: 390, type: 'forest', species: ['Sal','Mahua','Palash'], credits: 8100, avail: 5400, price: 740, ndvi: 0.63 },
    { land_id: 'LND-AP-0017890', state: 'Andhra Pradesh', district: 'Chittoor', area: 310, type: 'agricultural', species: ['Neem','Tamarind','Mango'], credits: 5500, avail: 3400, price: 620, ndvi: 0.49 },
    { land_id: 'LND-SK-0018901', state: 'Sikkim', district: 'East Sikkim', area: 170, type: 'forest', species: ['Rhododendron','Magnolia','Oak','Pine'], credits: 5900, avail: 4500, price: 950, ndvi: 0.86 },
    { land_id: 'LND-MN-0019012', state: 'Manipur', district: 'Imphal', area: 240, type: 'grassland', species: ['Bamboo','Pine','Oak'], credits: 4800, avail: 3900, price: 670, ndvi: 0.54 },
    { land_id: 'LND-TS-0020123', state: 'Telangana', district: 'Adilabad', area: 440, type: 'forest', species: ['Teak','Bamboo','Neem','Sal'], credits: 9200, avail: 5600, price: 790, ndvi: 0.66 },
  ];
  const landIds: string[] = [];
  const landMap: Record<string, {id: string; land_id: string}> = {};
  for (const l of lands) {
    const issued = l.credits - l.avail;
    const res = await pool.query(
      `INSERT INTO land_parcels (land_id, state, district, area_hectares, land_type, permitted_species, total_credits_generated, credits_available, credits_issued, price_per_credit, ndvi_score, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active')
       ON CONFLICT (land_id) DO UPDATE SET state=EXCLUDED.state RETURNING id`,
      [l.land_id, l.state, l.district, l.area, l.type, JSON.stringify(l.species), l.credits, l.avail, issued, l.price, l.ndvi]
    );
    landIds.push(res.rows[0].id);
    landMap[l.land_id] = { id: res.rows[0].id, land_id: l.land_id };
  }

  // =============== GENESIS BLOCK + 100 BLOCKCHAIN BLOCKS ===============
  const blockCount = await pool.query('SELECT COUNT(*) FROM carbon_credit_ledger');
  if (parseInt(blockCount.rows[0].count) === 0) {
    const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
    let prevHash = GENESIS_HASH;
    for (let i = 0; i < 101; i++) {
      const land = lands[i % 20];
      const eventTypes = ['generated', 'issued', 'generated'];
      const eventType = eventTypes[i % 3] as 'generated' | 'issued';
      const creditsDelta = eventType === 'issued' ? -(Math.floor(Math.random() * 500) + 50) : Math.floor(Math.random() * 200) + 100;
      const timestamp = new Date(Date.now() - (101 - i) * 24 * 60 * 60 * 1000);
      const blockData = {
        block_index: i,
        previous_hash: prevHash,
        land_id: land.land_id,
        credits_delta: creditsDelta,
        event_type: eventType,
        timestamp,
        nonce: 0,
        data: { event_type: eventType, land_id: land.land_id },
      };
      const mined = mineBlock(blockData);
      await pool.query(
        `INSERT INTO carbon_credit_ledger (block_index, block_hash, previous_hash, land_id, credits_delta, event_type, timestamp, nonce, data)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (block_index) DO NOTHING`,
        [mined.block_index, mined.block_hash, mined.previous_hash, mined.land_id, mined.credits_delta, mined.event_type, mined.timestamp, mined.nonce, JSON.stringify(mined.data)]
      );
      prevHash = mined.block_hash;
    }
    console.log('Seeded 101 blockchain blocks (valid chain).');
  }

  // =============== PURCHASE REQUESTS ===============
  const statuses = ['pending', 'under_review', 'approved', 'rejected', 'completed'];
  const requestIds: string[] = [];
  for (let i = 0; i < 30; i++) {
    const companyId = companyIds[i % 10];
    const landId = landIds[i % 20];
    const landLandId = lands[i % 20].land_id;
    const status = statuses[i % 5] as any;
    const credits = [100, 200, 300, 500, 800][i % 5];
    const duration = [1, 3, 5, 10][i % 4];
    const pricePerCredit = status === 'approved' || status === 'completed' ? lands[i % 20].price : null;
    const totalAmount = pricePerCredit ? pricePerCredit * credits : null;
    const year = 2024 + Math.floor(i / 15);
    const reqId = `REQ-${year}-${(i + 1).toString().padStart(5, '0')}`;
    const res = await pool.query(
      `INSERT INTO purchase_requests (request_id, company_id, land_parcel_id, credits_requested, duration_years, intended_use, status, reviewer_id, price_per_credit, total_amount, payment_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (request_id) DO UPDATE SET status=EXCLUDED.status RETURNING id`,
      [reqId, companyId, landId, credits, duration, 'Carbon offset for business operations', status,
       (status === 'approved' || status === 'rejected' || status === 'completed') ? officerIds[0] : null,
       pricePerCredit, totalAmount,
       status === 'completed' ? 'paid' : 'pending']
    );
    requestIds.push(res.rows[0].id);
  }

  // =============== CERTIFICATES ===============
  const certData = [
    { companyIdx: 0, landIdx: 0, credits: 500, daysAgo: 365, validYears: 3 },
    { companyIdx: 0, landIdx: 1, credits: 350, daysAgo: 300, validYears: 5 },
    { companyIdx: 1, landIdx: 6, credits: 800, daysAgo: 350, validYears: 1 },
    { companyIdx: 1, landIdx: 8, credits: 1200, daysAgo: 500, validYears: 3 },
    { companyIdx: 2, landIdx: 4, credits: 600, daysAgo: 700, validYears: 1 },
    { companyIdx: 2, landIdx: 1, credits: 400, daysAgo: 30, validYears: 3 },
    { companyIdx: 3, landIdx: 5, credits: 700, daysAgo: 60, validYears: 5 },
    { companyIdx: 3, landIdx: 14, credits: 900, daysAgo: 200, validYears: 3 },
    { companyIdx: 4, landIdx: 3, credits: 300, daysAgo: 350, validYears: 1 },
    { companyIdx: 0, landIdx: 12, credits: 550, daysAgo: 15, validYears: 3 },
    { companyIdx: 5, landIdx: 7, credits: 450, daysAgo: 120, validYears: 5 },
    { companyIdx: 6, landIdx: 9, credits: 650, daysAgo: 90, validYears: 3 },
    { companyIdx: 7, landIdx: 11, credits: 350, daysAgo: 45, validYears: 1 },
    { companyIdx: 8, landIdx: 15, credits: 800, daysAgo: 180, validYears: 3 },
    { companyIdx: 9, landIdx: 19, credits: 500, daysAgo: 75, validYears: 5 },
  ];
  for (let i = 0; i < certData.length; i++) {
    const d = certData[i];
    const companyId = companyIds[d.companyIdx];
    const landId = landIds[d.landIdx];
    const reqId = requestIds[i < requestIds.length ? i : 0];
    const year = 2023 + Math.floor(i / 8);
    const certId = `CC-${year}-${(i + 100).toString().padStart(5, '0')}`;
    const issuedAt = new Date(Date.now() - d.daysAgo * 24 * 60 * 60 * 1000);
    const validFrom = issuedAt;
    const validTo = new Date(issuedAt.getTime() + d.validYears * 365 * 24 * 60 * 60 * 1000);
    const status = validTo < new Date() ? 'expired' : validTo.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 ? 'active' : 'active';
    await pool.query(
      `INSERT INTO certificates (certificate_id, company_id, purchase_request_id, land_parcel_id, credits_issued, valid_from, valid_to, status, issued_by, blockchain_tx_hash, qr_code_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (certificate_id) DO NOTHING`,
      [certId, companyId, reqId, landId, d.credits, validFrom, validTo, status, officerIds[0],
       `hash_${uuidv4().replace(/-/g, '')}`,
       `http://localhost:5173/verify/${certId}`]
    );
  }

  // =============== NDVI LOGS ===============
  for (let i = 0; i < Math.min(landIds.length, 10); i++) {
    await pool.query(
      `INSERT INTO ndvi_logs (land_parcel_id, ndvi_score_before, ndvi_score_after, greenery_increase_percent, credits_added, calculation_rationale)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [landIds[i], lands[i].ndvi - 0.04, lands[i].ndvi, 4.2, Math.floor(lands[i].area * 20),
       'IPCC Tier 2 calculation based on NDVI increase from satellite imagery']
    ).catch(() => {});
  }

  // =============== NOTIFICATIONS ===============
  // Company notifications
  for (let i = 0; i < 5; i++) {
    await pool.query(
      `INSERT INTO notifications (recipient_type, recipient_id, type, title, message)
       VALUES ('company',$1,$2,$3,$4)`,
      [companyIds[i],
       ['request_submitted','certificate_issued','certificate_expiring','request_approved','payment_success'][i],
       ['Request Submitted','Certificate Issued','Certificate Expiring Soon','Purchase Approved','Payment Confirmed'][i],
       ['Your request REQ-2024-00001 has been submitted.','Certificate CC-2023-00100 issued for 500 credits.','Certificate CC-2023-00102 expires in 25 days.','Request REQ-2024-00002 approved at Rs.850/credit.','Payment confirmed for Rs.67,200. Certificate being generated.'][i]]
    ).catch(() => {});
  }
  // Officer notifications
  for (let i = 0; i < 3; i++) {
    await pool.query(
      `INSERT INTO notifications (recipient_type, recipient_id, type, title, message)
       VALUES ('officer',$1,$2,$3,$4)`,
      [officerIds[0],
       ['pending_requests','new_company','revenue_milestone'][i],
       ['Pending Requests Alert','New Company Registered','Revenue Milestone'][i],
       ['5 requests pending over 7 days requiring review.','Ashok Leyland registered and pending verification.','Total revenue crossed Rs.50 Cr this fiscal year.'][i]]
    ).catch(() => {});
  }

  // =============== PRINT CREDENTIALS ===============
  console.log('\n==================== SEEDED CREDENTIALS ====================\n');
  console.log('GOVERNMENT OFFICERS:');
  officerCredentials.forEach(o => {
    console.log(`  Officer ID: ${o.officer_id} | Name: ${o.name} | Role: ${o.role} | Password: ${o.password}`);
  });
  console.log('\nCOMPANIES:');
  companyCredentials.forEach(c => {
    console.log(`  CIN: ${c.cin} | Name: ${c.name} | Password: ${c.password}`);
  });
  console.log('\n20 land parcels seeded: LND-MH-0001234 ... LND-TS-0020123');
  console.log('30 purchase requests seeded in mixed statuses.');
  console.log('15 certificates seeded (active/expired).');
  console.log('101 blockchain blocks (valid chain).');
  console.log('\n=============================================================\n');

  await pool.end();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
