export interface University {
  name: string;
  shortName?: string;
  city: string;
  state: string;
  type: "Central" | "State" | "Private" | "Deemed" | "National Importance" | "Autonomous";
  ugcApproved: boolean;
  aliases?: string[];
}

export const UGC_UNIVERSITIES: University[] = [
  // --- Maharashtra (Special focus: Kolhapur, Pune, Mumbai, etc.) ---
  {
    name: "Sanjay Ghodawat University (SGU), Kolhapur",
    shortName: "SGU",
    city: "Kolhapur",
    state: "Maharashtra",
    type: "Private",
    ugcApproved: true,
    aliases: ["Sanjay Ghodawat", "Ghodawat", "SGU Kolhapur", "Atigre", "Kolhapur University"],
  },
  {
    name: "Shivaji University, Kolhapur",
    shortName: "SUK",
    city: "Kolhapur",
    state: "Maharashtra",
    type: "State",
    ugcApproved: true,
    aliases: ["SUK", "Shivaji University Kolhapur", "Uni Kolhapur"],
  },
  {
    name: "KIT's College of Engineering (Autonomous), Kolhapur",
    shortName: "KIT Kolhapur",
    city: "Kolhapur",
    state: "Maharashtra",
    type: "Autonomous",
    ugcApproved: true,
    aliases: ["KIT", "Kolhapur Institute of Technology"],
  },
  {
    name: "DKTE Society's Textile and Engineering Institute, Ichalkaranji",
    shortName: "DKTE",
    city: "Kolhapur / Ichalkaranji",
    state: "Maharashtra",
    type: "Autonomous",
    ugcApproved: true,
    aliases: ["DKTE", "DKTE Ichalkaranji"],
  },
  {
    name: "DY Patil Agriculture & Technical University, Talsande, Kolhapur",
    shortName: "DYPATU Kolhapur",
    city: "Kolhapur",
    state: "Maharashtra",
    type: "Private",
    ugcApproved: true,
    aliases: ["DY Patil Kolhapur", "DYPATU"],
  },
  {
    name: "Walchand College of Engineering (WCE), Sangli",
    shortName: "WCE Sangli",
    city: "Sangli",
    state: "Maharashtra",
    type: "Autonomous",
    ugcApproved: true,
    aliases: ["WCE", "Walchand Sangli"],
  },
  {
    name: "Government College of Engineering (GCE), Karad",
    shortName: "GCE Karad",
    city: "Karad",
    state: "Maharashtra",
    type: "Autonomous",
    ugcApproved: true,
    aliases: ["GCEK", "GCOEK"],
  },
  {
    name: "Savitribai Phule Pune University (SPPU), Pune",
    shortName: "SPPU",
    city: "Pune",
    state: "Maharashtra",
    type: "State",
    ugcApproved: true,
    aliases: ["Pune University", "SPPU", "UniPune"],
  },
  {
    name: "COEP Technological University, Pune",
    shortName: "COEP",
    city: "Pune",
    state: "Maharashtra",
    type: "State",
    ugcApproved: true,
    aliases: ["College of Engineering Pune", "COEP Tech", "COEP Pune"],
  },
  {
    name: "Indian Institute of Technology Bombay (IIT Bombay)",
    shortName: "IITB",
    city: "Mumbai",
    state: "Maharashtra",
    type: "National Importance",
    ugcApproved: true,
    aliases: ["IIT Bombay", "IIT Powai", "IITB Mumbai"],
  },
  {
    name: "University of Mumbai, Mumbai",
    shortName: "MU",
    city: "Mumbai",
    state: "Maharashtra",
    type: "State",
    ugcApproved: true,
    aliases: ["Mumbai University", "Bombay University", "MU"],
  },
  {
    name: "Veermata Jijabai Technological Institute (VJTI), Mumbai",
    shortName: "VJTI",
    city: "Mumbai",
    state: "Maharashtra",
    type: "Autonomous",
    ugcApproved: true,
    aliases: ["VJTI Mumbai", "VJTI Matunga"],
  },
  {
    name: "Institute of Chemical Technology (ICT), Mumbai",
    shortName: "ICT",
    city: "Mumbai",
    state: "Maharashtra",
    type: "Deemed",
    ugcApproved: true,
    aliases: ["ICT Mumbai", "UDCT"],
  },
  {
    name: "MIT World Peace University (MIT-WPU), Pune",
    shortName: "MIT-WPU",
    city: "Pune",
    state: "Maharashtra",
    type: "Private",
    ugcApproved: true,
    aliases: ["MIT Pune", "MIT WPU", "MAEER MIT"],
  },
  {
    name: "Vishwakarma Institute of Technology (VIT Pune)",
    shortName: "VIT Pune",
    city: "Pune",
    state: "Maharashtra",
    type: "Autonomous",
    ugcApproved: true,
    aliases: ["VIT Pune", "Vishwakarma Pune", "VIIT Pune"],
  },
  {
    name: "Symbiosis International (Deemed University), Pune",
    shortName: "SIU",
    city: "Pune",
    state: "Maharashtra",
    type: "Deemed",
    ugcApproved: true,
    aliases: ["Symbiosis", "SIU Pune", "SIT Pune"],
  },
  {
    name: "Bharati Vidyapeeth Deemed University, Pune",
    shortName: "BVDU",
    city: "Pune",
    state: "Maharashtra",
    type: "Deemed",
    ugcApproved: true,
    aliases: ["Bharati Vidyapeeth", "BVCOE", "BVDU Pune"],
  },
  {
    name: "Dr. D.Y. Patil Vidyapeeth (DPU), Pune",
    shortName: "DPU",
    city: "Pune",
    state: "Maharashtra",
    type: "Deemed",
    ugcApproved: true,
    aliases: ["DY Patil Pune", "DPU Pimpri", "DY Patil Akurdi"],
  },
  {
    name: "NMIMS Deemed to be University, Mumbai",
    shortName: "NMIMS",
    city: "Mumbai",
    state: "Maharashtra",
    type: "Deemed",
    ugcApproved: true,
    aliases: ["Narsee Monjee", "NMIMS Mumbai", "MPSTME"],
  },
  {
    name: "K. J. Somaiya College of Engineering, Mumbai",
    shortName: "KJSCE",
    city: "Mumbai",
    state: "Maharashtra",
    type: "Private",
    ugcApproved: true,
    aliases: ["Somaiya Vidyavihar", "Somaiya", "KJSCE"],
  },
  {
    name: "Visvesvaraya National Institute of Technology (VNIT), Nagpur",
    shortName: "VNIT",
    city: "Nagpur",
    state: "Maharashtra",
    type: "National Importance",
    ugcApproved: true,
    aliases: ["VNIT Nagpur", "NIT Nagpur", "VRCE"],
  },
  {
    name: "Rashtrasant Tukadoji Maharaj Nagpur University (RTMNU), Nagpur",
    shortName: "RTMNU",
    city: "Nagpur",
    state: "Maharashtra",
    type: "State",
    ugcApproved: true,
    aliases: ["Nagpur University", "RTMNU"],
  },
  {
    name: "Dr. Babasaheb Ambedkar Marathwada University (BAMU)",
    shortName: "BAMU",
    city: "Chhatrapati Sambhajinagar",
    state: "Maharashtra",
    type: "State",
    ugcApproved: true,
    aliases: ["BAMU", "Aurangabad University", "Marathwada University"],
  },
  {
    name: "Dr. Babasaheb Ambedkar Technological University (DBATU), Lonere",
    shortName: "DBATU",
    city: "Lonere / Raigad",
    state: "Maharashtra",
    type: "State",
    ugcApproved: true,
    aliases: ["DBATU", "BATU Lonere"],
  },
  {
    name: "Sant Gadge Baba Amravati University (SGBAU), Amravati",
    shortName: "SGBAU",
    city: "Amravati",
    state: "Maharashtra",
    type: "State",
    ugcApproved: true,
    aliases: ["Amravati University", "SGBAU"],
  },
  {
    name: "Swami Ramanand Teerth Marathwada University (SRTMUN), Nanded",
    shortName: "SRTMUN",
    city: "Nanded",
    state: "Maharashtra",
    type: "State",
    ugcApproved: true,
    aliases: ["SRTMUN", "Nanded University"],
  },
  {
    name: "Punyashlok Ahilyadevi Holkar Solapur University, Solapur",
    shortName: "PAHSU",
    city: "Solapur",
    state: "Maharashtra",
    type: "State",
    ugcApproved: true,
    aliases: ["Solapur University", "PAHSU"],
  },
  {
    name: "Kavayitri Bahinabai Chaudhari North Maharashtra University, Jalgaon",
    shortName: "KBCNMU",
    city: "Jalgaon",
    state: "Maharashtra",
    type: "State",
    ugcApproved: true,
    aliases: ["NMU", "North Maharashtra University", "KBCNMU"],
  },

  // --- Institutes of National Importance (IITs, NITs, IIITs, BITS, IISc) ---
  {
    name: "Indian Institute of Science (IISc), Bangalore",
    shortName: "IISc",
    city: "Bengaluru",
    state: "Karnataka",
    type: "National Importance",
    ugcApproved: true,
    aliases: ["IISc", "IISc Bangalore", "Tata Institute"],
  },
  {
    name: "Indian Institute of Technology Delhi (IIT Delhi)",
    shortName: "IITD",
    city: "New Delhi",
    state: "Delhi",
    type: "National Importance",
    ugcApproved: true,
    aliases: ["IIT Delhi", "IITD", "Hauz Khas"],
  },
  {
    name: "Indian Institute of Technology Madras (IIT Madras)",
    shortName: "IITM",
    city: "Chennai",
    state: "Tamil Nadu",
    type: "National Importance",
    ugcApproved: true,
    aliases: ["IIT Madras", "IITM", "IIT Chennai"],
  },
  {
    name: "Indian Institute of Technology Kanpur (IIT Kanpur)",
    shortName: "IITK",
    city: "Kanpur",
    state: "Uttar Pradesh",
    type: "National Importance",
    ugcApproved: true,
    aliases: ["IIT Kanpur", "IITK"],
  },
  {
    name: "Indian Institute of Technology Kharagpur (IIT Kharagpur)",
    shortName: "IIT KGP",
    city: "Kharagpur",
    state: "West Bengal",
    type: "National Importance",
    ugcApproved: true,
    aliases: ["IIT Kharagpur", "IIT KGP"],
  },
  {
    name: "Indian Institute of Technology Roorkee (IIT Roorkee)",
    shortName: "IITR",
    city: "Roorkee",
    state: "Uttarakhand",
    type: "National Importance",
    ugcApproved: true,
    aliases: ["IIT Roorkee", "IITR", "Thomason College"],
  },
  {
    name: "Indian Institute of Technology Guwahati (IIT Guwahati)",
    shortName: "IITG",
    city: "Guwahati",
    state: "Assam",
    type: "National Importance",
    ugcApproved: true,
    aliases: ["IIT Guwahati", "IITG"],
  },
  {
    name: "Indian Institute of Technology Hyderabad (IIT Hyderabad)",
    shortName: "IITH",
    city: "Hyderabad",
    state: "Telangana",
    type: "National Importance",
    ugcApproved: true,
    aliases: ["IIT Hyderabad", "IITH", "Kandi"],
  },
  {
    name: "Indian Institute of Technology (BHU) Varanasi",
    shortName: "IIT BHU",
    city: "Varanasi",
    state: "Uttar Pradesh",
    type: "National Importance",
    ugcApproved: true,
    aliases: ["IIT BHU", "IT BHU"],
  },
  {
    name: "Indian Institute of Technology Gandhinagar (IIT Gandhinagar)",
    shortName: "IITGN",
    city: "Gandhinagar",
    state: "Gujarat",
    type: "National Importance",
    ugcApproved: true,
    aliases: ["IIT Gandhinagar", "IITGN"],
  },
  {
    name: "Indian Institute of Technology Indore (IIT Indore)",
    shortName: "IITI",
    city: "Indore",
    state: "Madhya Pradesh",
    type: "National Importance",
    ugcApproved: true,
    aliases: ["IIT Indore", "IITI"],
  },
  {
    name: "Birla Institute of Technology and Science (BITS Pilani)",
    shortName: "BITS Pilani",
    city: "Pilani",
    state: "Rajasthan",
    type: "Deemed",
    ugcApproved: true,
    aliases: ["BITS", "BITS Pilani", "Pilani"],
  },
  {
    name: "BITS Pilani - K.K. Birla Goa Campus",
    shortName: "BITS Goa",
    city: "Zuarinagar",
    state: "Goa",
    type: "Deemed",
    ugcApproved: true,
    aliases: ["BITS Goa", "BITS Pilani Goa"],
  },
  {
    name: "BITS Pilani - Hyderabad Campus",
    shortName: "BITS Hyderabad",
    city: "Hyderabad",
    state: "Telangana",
    type: "Deemed",
    ugcApproved: true,
    aliases: ["BITS Hyderabad", "BITS Pilani Hyderabad"],
  },
  {
    name: "National Institute of Technology Tiruchirappalli (NIT Trichy)",
    shortName: "NITT",
    city: "Tiruchirappalli",
    state: "Tamil Nadu",
    type: "National Importance",
    ugcApproved: true,
    aliases: ["NIT Trichy", "NITT", "REC Trichy"],
  },
  {
    name: "National Institute of Technology Karnataka (NIT Surathkal)",
    shortName: "NITK",
    city: "Mangaluru",
    state: "Karnataka",
    type: "National Importance",
    ugcApproved: true,
    aliases: ["NIT Surathkal", "NITK", "KREC"],
  },
  {
    name: "National Institute of Technology Warangal (NIT Warangal)",
    shortName: "NITW",
    city: "Warangal",
    state: "Telangana",
    type: "National Importance",
    ugcApproved: true,
    aliases: ["NIT Warangal", "NITW", "RECW"],
  },
  {
    name: "National Institute of Technology Rourkela (NIT Rourkela)",
    shortName: "NITR",
    city: "Rourkela",
    state: "Odisha",
    type: "National Importance",
    ugcApproved: true,
    aliases: ["NIT Rourkela", "NITRKL"],
  },
  {
    name: "National Institute of Technology Calicut (NIT Calicut)",
    shortName: "NITC",
    city: "Kozhikode",
    state: "Kerala",
    type: "National Importance",
    ugcApproved: true,
    aliases: ["NIT Calicut", "NITC", "CREC"],
  },
  {
    name: "Sardar Vallabhbhai National Institute of Technology (SVNIT), Surat",
    shortName: "SVNIT",
    city: "Surat",
    state: "Gujarat",
    type: "National Importance",
    ugcApproved: true,
    aliases: ["SVNIT Surat", "NIT Surat"],
  },
  {
    name: "Motilal Nehru National Institute of Technology (MNNIT), Allahabad",
    shortName: "MNNIT",
    city: "Prayagraj",
    state: "Uttar Pradesh",
    type: "National Importance",
    ugcApproved: true,
    aliases: ["MNNIT Allahabad", "NIT Allahabad", "MNREC"],
  },
  {
    name: "Malaviya National Institute of Technology (MNIT), Jaipur",
    shortName: "MNIT",
    city: "Jaipur",
    state: "Rajasthan",
    type: "National Importance",
    ugcApproved: true,
    aliases: ["MNIT Jaipur", "NIT Jaipur"],
  },
  {
    name: "Indian Institute of Information Technology Hyderabad (IIIT Hyderabad)",
    shortName: "IIIT-H",
    city: "Hyderabad",
    state: "Telangana",
    type: "Deemed",
    ugcApproved: true,
    aliases: ["IIIT Hyderabad", "IIITH"],
  },
  {
    name: "Indian Institute of Information Technology Bangalore (IIIT Bangalore)",
    shortName: "IIIT-B",
    city: "Bengaluru",
    state: "Karnataka",
    type: "Deemed",
    ugcApproved: true,
    aliases: ["IIIT Bangalore", "IIITB"],
  },
  {
    name: "Indraprastha Institute of Information Technology Delhi (IIIT Delhi)",
    shortName: "IIIT-D",
    city: "New Delhi",
    state: "Delhi",
    type: "State",
    ugcApproved: true,
    aliases: ["IIIT Delhi", "IIITD"],
  },

  // --- Delhi & NCR ---
  {
    name: "University of Delhi (DU), New Delhi",
    shortName: "DU",
    city: "New Delhi",
    state: "Delhi",
    type: "Central",
    ugcApproved: true,
    aliases: ["Delhi University", "DU", "North Campus", "South Campus"],
  },
  {
    name: "Delhi Technological University (DTU), Delhi",
    shortName: "DTU",
    city: "Delhi",
    state: "Delhi",
    type: "State",
    ugcApproved: true,
    aliases: ["DTU", "Delhi College of Engineering", "DCE"],
  },
  {
    name: "Netaji Subhas University of Technology (NSUT), Delhi",
    shortName: "NSUT",
    city: "Delhi",
    state: "Delhi",
    type: "State",
    ugcApproved: true,
    aliases: ["NSUT", "NSIT Dwarka"],
  },
  {
    name: "Jawaharlal Nehru University (JNU), New Delhi",
    shortName: "JNU",
    city: "New Delhi",
    state: "Delhi",
    type: "Central",
    ugcApproved: true,
    aliases: ["JNU Delhi", "JNU"],
  },
  {
    name: "Jamia Millia Islamia, New Delhi",
    shortName: "JMI",
    city: "New Delhi",
    state: "Delhi",
    type: "Central",
    ugcApproved: true,
    aliases: ["Jamia", "JMI Delhi"],
  },
  {
    name: "Guru Gobind Singh Indraprastha University (GGSIPU), Delhi",
    shortName: "IPU",
    city: "Delhi",
    state: "Delhi",
    type: "State",
    ugcApproved: true,
    aliases: ["IP University", "IPU", "GGSIPU"],
  },

  // --- Karnataka ---
  {
    name: "Visvesvaraya Technological University (VTU), Belagavi",
    shortName: "VTU",
    city: "Belagavi",
    state: "Karnataka",
    type: "State",
    ugcApproved: true,
    aliases: ["VTU Belagavi", "VTU Karnataka"],
  },
  {
    name: "Manipal Academy of Higher Education (MAHE), Manipal",
    shortName: "MAHE",
    city: "Manipal",
    state: "Karnataka",
    type: "Deemed",
    ugcApproved: true,
    aliases: ["Manipal University", "MIT Manipal", "MAHE"],
  },
  {
    name: "R.V. College of Engineering (Autonomous), Bengaluru",
    shortName: "RVCE",
    city: "Bengaluru",
    state: "Karnataka",
    type: "Autonomous",
    ugcApproved: true,
    aliases: ["RVCE Bangalore", "RV College"],
  },
  {
    name: "BMS College of Engineering, Bengaluru",
    shortName: "BMSCE",
    city: "Bengaluru",
    state: "Karnataka",
    type: "Autonomous",
    ugcApproved: true,
    aliases: ["BMSCE Bangalore", "BMS College"],
  },
  {
    name: "Ramaiah Institute of Technology (MSRIT), Bengaluru",
    shortName: "MSRIT",
    city: "Bengaluru",
    state: "Karnataka",
    type: "Autonomous",
    ugcApproved: true,
    aliases: ["MS Ramaiah", "MSRIT Bangalore"],
  },
  {
    name: "PES University, Bengaluru",
    shortName: "PESU",
    city: "Bengaluru",
    state: "Karnataka",
    type: "Private",
    ugcApproved: true,
    aliases: ["PES University", "PESIT"],
  },
  {
    name: "Christ (Deemed to be University), Bengaluru",
    shortName: "Christ University",
    city: "Bengaluru",
    state: "Karnataka",
    type: "Deemed",
    ugcApproved: true,
    aliases: ["Christ University", "Christ Bangalore"],
  },

  // --- Tamil Nadu ---
  {
    name: "Vellore Institute of Technology (VIT), Vellore",
    shortName: "VIT",
    city: "Vellore",
    state: "Tamil Nadu",
    type: "Deemed",
    ugcApproved: true,
    aliases: ["VIT Vellore", "VIT Chennai", "VIT University"],
  },
  {
    name: "Anna University, Chennai",
    shortName: "Anna University",
    city: "Chennai",
    state: "Tamil Nadu",
    type: "State",
    ugcApproved: true,
    aliases: ["Anna Univ", "CEG Guindy", "MIT Chromepet"],
  },
  {
    name: "SRM Institute of Science and Technology, Chennai",
    shortName: "SRM",
    city: "Chennai",
    state: "Tamil Nadu",
    type: "Deemed",
    ugcApproved: true,
    aliases: ["SRM University", "SRM Kattankulathur"],
  },
  {
    name: "PSG College of Technology, Coimbatore",
    shortName: "PSG Tech",
    city: "Coimbatore",
    state: "Tamil Nadu",
    type: "Autonomous",
    ugcApproved: true,
    aliases: ["PSG Tech Coimbatore", "PSG College"],
  },
  {
    name: "Amrita Vishwa Vidyapeetham, Coimbatore",
    shortName: "Amrita",
    city: "Coimbatore",
    state: "Tamil Nadu",
    type: "Deemed",
    ugcApproved: true,
    aliases: ["Amrita University", "Amrita Coimbatore"],
  },
  {
    name: "SASTRA (Deemed to be University), Thanjavur",
    shortName: "SASTRA",
    city: "Thanjavur",
    state: "Tamil Nadu",
    type: "Deemed",
    ugcApproved: true,
    aliases: ["SASTRA University", "SASTRA Thanjavur"],
  },
  {
    name: "SSN College of Engineering, Chennai",
    shortName: "SSN",
    city: "Chennai",
    state: "Tamil Nadu",
    type: "Autonomous",
    ugcApproved: true,
    aliases: ["SSN Chennai", "SSNCE"],
  },

  // --- Telangana & Andhra Pradesh ---
  {
    name: "Jawaharlal Nehru Technological University (JNTU), Hyderabad",
    shortName: "JNTUH",
    city: "Hyderabad",
    state: "Telangana",
    type: "State",
    ugcApproved: true,
    aliases: ["JNTU Hyderabad", "JNTUH"],
  },
  {
    name: "Osmania University, Hyderabad",
    shortName: "OU",
    city: "Hyderabad",
    state: "Telangana",
    type: "State",
    ugcApproved: true,
    aliases: ["Osmania", "OU Hyderabad"],
  },
  {
    name: "Chaitanya Bharathi Institute of Technology (CBIT), Hyderabad",
    shortName: "CBIT",
    city: "Hyderabad",
    state: "Telangana",
    type: "Autonomous",
    ugcApproved: true,
    aliases: ["CBIT Hyderabad"],
  },
  {
    name: "Andhra University, Visakhapatnam",
    shortName: "AU",
    city: "Visakhapatnam",
    state: "Andhra Pradesh",
    type: "State",
    ugcApproved: true,
    aliases: ["Andhra University Vizag", "AU Vizag"],
  },
  {
    name: "Koneru Lakshmaiah Education Foundation (KL University), Guntur",
    shortName: "KLU",
    city: "Vijayawada",
    state: "Andhra Pradesh",
    type: "Deemed",
    ugcApproved: true,
    aliases: ["KL University", "KLU"],
  },

  // --- Uttar Pradesh, Punjab, Haryana, Rajasthan, Gujarat, West Bengal ---
  {
    name: "Banaras Hindu University (BHU), Varanasi",
    shortName: "BHU",
    city: "Varanasi",
    state: "Uttar Pradesh",
    type: "Central",
    ugcApproved: true,
    aliases: ["BHU Varanasi", "Kashi Hindu Vishwavidyalaya"],
  },
  {
    name: "Aligarh Muslim University (AMU), Aligarh",
    shortName: "AMU",
    city: "Aligarh",
    state: "Uttar Pradesh",
    type: "Central",
    ugcApproved: true,
    aliases: ["AMU Aligarh"],
  },
  {
    name: "Dr. A.P.J. Abdul Kalam Technical University (AKTU), Lucknow",
    shortName: "AKTU",
    city: "Lucknow",
    state: "Uttar Pradesh",
    type: "State",
    ugcApproved: true,
    aliases: ["AKTU Lucknow", "UPTU"],
  },
  {
    name: "Amity University, Noida",
    shortName: "Amity",
    city: "Noida",
    state: "Uttar Pradesh",
    type: "Private",
    ugcApproved: true,
    aliases: ["Amity Noida", "Amity University"],
  },
  {
    name: "Thapar Institute of Engineering and Technology (TIET), Patiala",
    shortName: "Thapar",
    city: "Patiala",
    state: "Punjab",
    type: "Deemed",
    ugcApproved: true,
    aliases: ["Thapar University", "Thapar Patiala"],
  },
  {
    name: "Chandigarh University, Mohali",
    shortName: "CU",
    city: "Mohali / Chandigarh",
    state: "Punjab",
    type: "Private",
    ugcApproved: true,
    aliases: ["CU Mohali", "Chandigarh University"],
  },
  {
    name: "Lovely Professional University (LPU), Phagwara",
    shortName: "LPU",
    city: "Phagwara / Jalandhar",
    state: "Punjab",
    type: "Private",
    ugcApproved: true,
    aliases: ["LPU Jalandhar", "LPU Punjab"],
  },
  {
    name: "Panjab University, Chandigarh",
    shortName: "PU",
    city: "Chandigarh",
    state: "Chandigarh",
    type: "State",
    ugcApproved: true,
    aliases: ["Panjab University Chandigarh", "PU Chd"],
  },
  {
    name: "Gujarat Technological University (GTU), Ahmedabad",
    shortName: "GTU",
    city: "Ahmedabad",
    state: "Gujarat",
    type: "State",
    ugcApproved: true,
    aliases: ["GTU Ahmedabad", "GTU"],
  },
  {
    name: "Nirma University, Ahmedabad",
    shortName: "Nirma",
    city: "Ahmedabad",
    state: "Gujarat",
    type: "Private",
    ugcApproved: true,
    aliases: ["Nirma Ahmedabad", "Nirma Institute"],
  },
  {
    name: "Pandit Deendayal Energy University (PDEU), Gandhinagar",
    shortName: "PDEU",
    city: "Gandhinagar",
    state: "Gujarat",
    type: "Private",
    ugcApproved: true,
    aliases: ["PDPU", "PDEU Gandhinagar"],
  },
  {
    name: "Dhirubhai Ambani Institute of ICT (DA-IICT), Gandhinagar",
    shortName: "DA-IICT",
    city: "Gandhinagar",
    state: "Gujarat",
    type: "Private",
    ugcApproved: true,
    aliases: ["DAIICT Gandhinagar", "DAIICT"],
  },
  {
    name: "Jadavpur University, Kolkata",
    shortName: "JU",
    city: "Kolkata",
    state: "West Bengal",
    type: "State",
    ugcApproved: true,
    aliases: ["Jadavpur Kolkata", "JU Kolkata"],
  },
  {
    name: "University of Calcutta, Kolkata",
    shortName: "CU",
    city: "Kolkata",
    state: "West Bengal",
    type: "State",
    ugcApproved: true,
    aliases: ["Calcutta University", "CU Kolkata"],
  },
  {
    name: "Kalinga Institute of Industrial Technology (KIIT), Bhubaneswar",
    shortName: "KIIT",
    city: "Bhubaneswar",
    state: "Odisha",
    type: "Deemed",
    ugcApproved: true,
    aliases: ["KIIT Bhubaneswar", "KIIT University"],
  },
];

/**
 * Search universities with smart substring and token matching.
 * Checks against name, short name, city, state, and aliases.
 */
export function searchUniversities(query: string, limit = 8): University[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  // Match ranking:
  // 1. Starts with query in name or shortName
  // 2. Starts with query in aliases
  // 3. Contains query in name or shortName
  // 4. Contains query in city, state, or aliases
  const startsWithMatches: University[] = [];
  const containsMatches: University[] = [];

  for (const u of UGC_UNIVERSITIES) {
    const nameLower = u.name.toLowerCase();
    const shortLower = (u.shortName || "").toLowerCase();
    const cityLower = u.city.toLowerCase();
    const stateLower = u.state.toLowerCase();
    const aliases = (u.aliases || []).map((a) => a.toLowerCase());

    const isStartsWith =
      nameLower.startsWith(q) ||
      shortLower.startsWith(q) ||
      aliases.some((a) => a.startsWith(q));

    if (isStartsWith) {
      startsWithMatches.push(u);
    } else {
      const isContains =
        nameLower.includes(q) ||
        shortLower.includes(q) ||
        cityLower.includes(q) ||
        stateLower.includes(q) ||
        aliases.some((a) => a.includes(q));

      if (isContains) {
        containsMatches.push(u);
      }
    }
  }

  return [...startsWithMatches, ...containsMatches].slice(0, limit);
}

/**
 * Checks if a given university name is recognized in the UGC list.
 */
export function isUGCApproved(name: string): boolean {
  const n = name.trim().toLowerCase();
  if (!n) return false;

  return UGC_UNIVERSITIES.some((u) => {
    if (u.name.toLowerCase() === n) return true;
    if (u.shortName && u.shortName.toLowerCase() === n) return true;
    if (u.aliases && u.aliases.some((a) => a.toLowerCase() === n)) return true;
    return false;
  });
}

/**
 * Validates if an email belongs to an official academic / university domain.
 * Disallows common personal free email providers (Gmail, Yahoo, Outlook, etc.).
 */
export function isUniversityEmail(email: string): boolean {
  const clean = email.trim().toLowerCase();
  if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) return false;
  const parts = clean.split("@");
  if (parts.length !== 2) return false;
  const domain = parts[1];

  const blocked = [
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "yahoo.co.in",
    "yahoo.in",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "msn.com",
    "icloud.com",
    "me.com",
    "rediffmail.com",
    "rediff.com",
    "protonmail.com",
    "proton.me",
    "zoho.com",
    "zohomail.in",
    "aol.com",
    "mail.com",
    "gmx.com",
    "yandex.com",
  ];

  if (blocked.includes(domain)) return false;

  return (
    domain.endsWith(".ac.in") ||
    domain.endsWith(".edu.in") ||
    domain.endsWith(".edu") ||
    domain.endsWith(".res.in") ||
    domain.endsWith(".ernet.in") ||
    domain.endsWith(".ac.uk") ||
    domain.endsWith(".ac") ||
    domain.includes("sguk.ac.in") ||
    domain.includes("sgu.ac.in") ||
    domain.includes(".univ.") ||
    domain.includes(".college") ||
    domain.includes(".institute")
  );
}
