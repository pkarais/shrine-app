export type Lang = "en" | "el"

type Entry = { en: string; el: string }

export const marketingStrings = {
  // Nav
  navOverview: { en: "Overview", el: "Επισκόπηση" },
  navBlog: { en: "Blog Post", el: "Άρθρο" },
  navArchive: { en: "Archive", el: "Αρχείο" },
  navBackToDashboard: { en: "Back to Dashboard", el: "Πίσω στον Πίνακα" },
  navRecognition: { en: "Recognition", el: "Αναγνώριση" },
  navStaffSignIn: { en: "Staff Sign In", el: "Σύνδεση Προσωπικού" },

  // Hero
  heroEyebrow: { en: "National Shrine Operations Platform", el: "Πλατφόρμα Λειτουργιών Εθνικού Ιερού" },
  heroTitle: {
    en: "The operational source of truth for the National Shrine.",
    el: "Η λειτουργική πηγή αλήθειας για το Εθνικό Ιερό.",
  },
  heroBody: {
    en: "Shrine Ops brings staffing, payroll reporting, messaging, maintenance, walkthroughs, alerts, daily briefings, and employee recognition into one clear system built around the real daily life of the Shrine.",
    el: "Το Shrine Ops ενοποιεί στελέχωση, αναφορές μισθοδοσίας, μηνύματα, συντήρηση, επιθεωρήσεις, ειδοποιήσεις, ημερήσιες ενημερώσεις και αναγνώριση εργαζομένων σε ένα σαφές σύστημα, σχεδιασμένο γύρω από την καθημερινή ζωή του Ιερού.",
  },
  ctaReadLaunch: { en: "Read the launch post", el: "Διαβάστε το άρθρο εκκίνησης" },
  ctaExplore: { en: "Explore the system", el: "Εξερευνήστε το σύστημα" },

  // Breakdown
  breakdownKicker: { en: "Plain-English Breakdown", el: "Συνοπτική Παρουσίαση" },
  breakdownTitle: {
    en: "One place for every operational moving part.",
    el: "Ένα σημείο για κάθε λειτουργικό στοιχείο.",
  },
  breakdownLead: {
    en: "Instead of scattered spreadsheets, paper sign-in sheets, radio calls, text threads, and disconnected files, Shrine Ops gives the team one trusted place to see what is happening, what needs attention, who is assigned, and what has already been completed.",
    el: "Αντί για διάσπαρτα φύλλα, χάρτινες παρουσίες, κλήσεις, μηνύματα και ασύνδετα αρχεία, το Shrine Ops προσφέρει στην ομάδα ένα αξιόπιστο μέρος για να δει τι συμβαίνει, τι χρειάζεται προσοχή, ποιος είναι αναθεσμένος και τι έχει ολοκληρωθεί.",
  },
  cardDailyCommand: { en: "Daily Command", el: "Καθημερινή Διοίκηση" },
  cardStaffDashboard: { en: "Staff Dashboard", el: "Πίνακας Προσωπικού" },
  cardStaffDashboardBody: {
    en: "Employees start their day with clock-in, assignments, briefings, messages, alerts, and quick actions from one screen.",
    el: "Οι εργαζόμενοι ξεκινούν τη μέρα με σύνδεση, αναθέσεις, ενημερώσεις, μηνύματα, ειδοποιήσεις και γρήγορες ενέργειες από μία οθόνη.",
  },
  cardLeadership: { en: "Leadership View", el: "Προβολή Ηγεσίας" },
  cardManagerCenter: { en: "Manager Command Center", el: "Κέντρο Ελέγχου Διοίκησης" },
  cardManagerCenterBody: {
    en: "Management can review staffing, open issues, alerts, reports, payroll summaries, and daily activity without chasing updates.",
    el: "Η διοίκηση μπορεί να ελέγχει στελέχωση, ανοιχτά ζητήματα, ειδοποιήσεις, αναφορές, μισθοδοσία και δραστηριότητα χωρίς να αναζητά ενημερώσεις.",
  },
  cardBuildingCare: { en: "Building Care", el: "Φροντίδα Κτηρίου" },
  cardTickets: { en: "Tickets & Walkthroughs", el: "Δελτία & Επιθεωρήσεις" },
  cardTicketsBody: {
    en: "Maintenance concerns, inspections, and daily readiness checks are submitted, tracked, and resolved in an organized workflow.",
    el: "Ζητήματα συντήρησης, επιθεωρήσεις και έλεγχοι ετοιμότητας υποβάλλονται, παρακολουθούνται και επιλύονται με οργανωμένο τρόπο.",
  },

  // Ties section
  tiesKicker: { en: "What It Ties Together", el: "Τι Συνδέει" },
  tiesTitle: {
    en: "Operations, people, reporting, and communication — connected.",
    el: "Λειτουργίες, άνθρωποι, αναφορές και επικοινωνία — συνδεδεμένα.",
  },
  feat1: { en: "Clock-in, shift history, and payroll reporting", el: "Σύνδεση, ιστορικό βαρδιών και αναφορές μισθοδοσίας" },
  feat2: { en: "Daily briefings and operations bulletins", el: "Ημερήσιες ενημερώσεις και ανακοινώσεις" },
  feat3: { en: "Staff messaging, group chats, and broadcasts", el: "Μηνύματα, ομαδικές συνομιλίες και ανακοινώσεις" },
  feat4: { en: "Maintenance tickets and issue resolution", el: "Δελτία συντήρησης και επίλυση ζητημάτων" },
  feat5: { en: "Security and facility walkthroughs", el: "Επιθεωρήσεις ασφαλείας και εγκαταστάσεων" },
  feat6: { en: "Visitor awareness and event readiness", el: "Επίγνωση επισκεπτών και ετοιμότητα εκδηλώσεων" },
  feat7: { en: "Incident reports and manager alerts", el: "Αναφορές περιστατικών και ειδοποιήσεις διοίκησης" },
  feat8: { en: "Employee recognition, badges, and leaderboard", el: "Αναγνώριση εργαζομένων, σήματα και κατάταξη" },

  // Payroll
  payrollKicker: { en: "Payroll & Reporting", el: "Μισθοδοσία & Αναφορές" },
  payrollTitle: {
    en: "Cleaner payroll preparation and better monthly reporting.",
    el: "Καθαρότερη προετοιμασία μισθοδοσίας και καλύτερες μηνιαίες αναφορές.",
  },
  payrollLead: {
    en: "Shrine Ops helps turn daily staff activity into organized reports. Hours, shifts, overtime flags, tickets, walkthroughs, incidents, and visitor trends can be reviewed from one place, helping leadership see both the daily picture and the monthly story.",
    el: "Το Shrine Ops μετατρέπει την καθημερινή δραστηριότητα σε οργανωμένες αναφορές. Ώρες, βάρδιες, υπερωρίες, δελτία, επιθεωρήσεις, περιστατικά και τάσεις επισκεπτών είναι διαθέσιμα σε ένα σημείο.",
  },
  step1Title: { en: "Staff clock in and out", el: "Το προσωπικό συνδέεται και αποσυνδέεται" },
  step1Body: { en: "The system records shift activity and keeps an accurate history for review.", el: "Το σύστημα καταγράφει τη δραστηριότητα βαρδιών και διατηρεί ακριβές ιστορικό." },
  step2Title: { en: "Hours are organized by pay period", el: "Οι ώρες οργανώνονται ανά περίοδο πληρωμής" },
  step2Body: { en: "Managers can review regular hours, overtime concerns, and gross pay summaries.", el: "Η διοίκηση εξετάζει κανονικές ώρες, υπερωρίες και συνόψεις μικτών αποδοχών." },
  step3Title: { en: "Reports become easier to produce", el: "Οι αναφορές γίνονται ευκολότερες" },
  step3Body: { en: "Monthly summaries help show staffing, maintenance activity, incidents, and overall operational workload.", el: "Μηνιαίες συνόψεις δείχνουν στελέχωση, συντήρηση, περιστατικά και φόρτο εργασίας." },

  // Recognition
  recogKicker: { en: "Employee Recognition", el: "Αναγνώριση Εργαζομένων" },
  recogTitle: { en: "Built-in morale, pride, and achievement.", el: "Ενσωματωμένο ηθικό, υπερηφάνεια και επίτευξη." },
  recogLead: {
    en: "The recognition program celebrates the people who keep the Shrine ready, clean, safe, and welcoming. Staff earn points and badges for positive contributions such as completing walkthroughs, resolving tickets, showing up on time, helping with events, and going above and beyond.",
    el: "Το πρόγραμμα αναγνώρισης τιμά όσους κρατούν το Ιερό έτοιμο, καθαρό, ασφαλές και φιλόξενο. Το προσωπικό κερδίζει πόντους και σήματα για θετικές συνεισφορές.",
  },
  badgeBadges: { en: "Badges", el: "Σήματα" },
  badgeAchievements: { en: "Earned Achievements", el: "Κερδισμένες Επιτεύξεις" },
  badgeAchievementsBody: { en: "Employees build a visible collection of accomplishments tied to real operational contributions.", el: "Οι εργαζόμενοι χτίζουν μια ορατή συλλογή επιτευγμάτων συνδεδεμένη με πραγματικές συνεισφορές." },
  badgeLeaderboard: { en: "Leaderboard", el: "Κατάταξη" },
  badgeHealthy: { en: "Healthy Motivation", el: "Υγιές Κίνητρο" },
  badgeHealthyBody: { en: "The leaderboard gives staff a positive way to see progress, consistency, and teamwork recognized.", el: "Η κατάταξη δείχνει πρόοδο, συνέπεια και ομαδική εργασία με θετικό τρόπο." },
  badgeEOTM: { en: "EOTM", el: "Εργαζόμενος του Μήνα" },
  badgeEOTMTitle: { en: "Employee of the Month", el: "Εργαζόμενος του Μήνα" },
  badgeEOTMBody: { en: "Top contributors can be highlighted formally, reinforcing pride and long-term engagement.", el: "Οι κορυφαίοι αναδεικνύονται επίσημα, ενισχύοντας την υπερηφάνεια και τη μακροχρόνια αφοσίωση." },

  // Latest
  latestKicker: { en: "Latest", el: "Πρόσφατα" },
  latestTitle: { en: "Blog & updates", el: "Άρθρα & Ενημερώσεις" },
  launchMeta: { en: "Launch Article · Shrine Ops", el: "Άρθρο Εκκίνησης · Shrine Ops" },
  launchCardTitle: { en: "Introducing Shrine Ops: The Operational Source of Truth for the National Shrine", el: "Παρουσίαση Shrine Ops: Η Λειτουργική Πηγή Αλήθειας του Εθνικού Ιερού" },
  launchCardBody: { en: "A polished public-facing overview of the platform and how it simplifies daily operations.", el: "Μια ολοκληρωμένη δημόσια παρουσίαση της πλατφόρμας και πώς απλοποιεί τις καθημερινές λειτουργίες." },
  archiveCardMeta: { en: "Archive", el: "Αρχείο" },
  archiveCardTitle: { en: "View all updates", el: "Δείτε όλες τις ενημερώσεις" },
  archiveCardBody: { en: "Browse published monthly operations briefs, announcements, and recognition highlights.", el: "Περιηγηθείτε σε μηνιαίες αναφορές, ανακοινώσεις και αναγνωρίσεις." },

  // Footer
  footerNote: { en: "Built to support clarity, accountability, communication, and recognition across Shrine operations.", el: "Δημιουργήθηκε για σαφήνεια, υπευθυνότητα, επικοινωνία και αναγνώριση στις λειτουργίες του Ιερού." },

  // Archive page
  archivePageKicker: { en: "Archive", el: "Αρχείο" },
  archivePageTitle: { en: "Operations updates, announcements, and monthly records.", el: "Λειτουργικές ενημερώσεις, ανακοινώσεις και μηνιαίες καταγραφές." },
  archivePageLead: {
    en: "Browse published monthly operations briefs, recognition announcements, and platform updates from the Shrine Ops team.",
    el: "Περιηγηθείτε σε δημοσιευμένες μηνιαίες αναφορές, ανακοινώσεις αναγνώρισης και ενημερώσεις πλατφόρμας από την ομάδα Shrine Ops.",
  },
  archiveEmpty: { en: "No archived posts yet. Check back soon.", el: "Δεν υπάρχουν ακόμη αρχειοθετημένα άρθρα. Ελέγξτε σύντομα." },
  archiveOpenPost: { en: "Open Post", el: "Άνοιγμα Άρθρου" },
  archiveDownloadPdf: { en: "Download PDF", el: "Λήψη PDF" },
  archiveLoading: { en: "Loading archive...", el: "Φόρτωση αρχείου..." },

  // Launch article
  articleEyebrow: { en: "Launch Article", el: "Άρθρο Εκκίνησης" },
  articleTitle: { en: "Introducing Shrine Ops", el: "Παρουσίαση Shrine Ops" },
  articleMeta: { en: "The operational source of truth for St. Nicholas Greek Orthodox Church & National Shrine.", el: "Η λειτουργική πηγή αλήθειας για τον Άγιο Νικόλαο και το Εθνικό Ιερό." },
  articleP1: {
    en: "At the National Shrine, operations are not one single task. They are a daily rhythm of people, preparation, communication, maintenance, safety, service readiness, visitor support, reporting, and leadership oversight.",
    el: "Στο Εθνικό Ιερό, οι λειτουργίες δεν είναι ένα μόνο καθήκον. Είναι ένας καθημερινός ρυθμός ανθρώπων, προετοιμασίας, επικοινωνίας, συντήρησης, ασφάλειας, ετοιμότητας ακολουθίας, υποστήριξης επισκεπτών, αναφορών και εποπτείας.",
  },
  articleP2: {
    en: "Shrine Ops was created to bring that full rhythm into one clear, organized, and accessible platform.",
    el: "Το Shrine Ops δημιουργήθηκε για να φέρει αυτόν τον ρυθμό σε μια σαφή, οργανωμένη και προσβάσιμη πλατφόρμα.",
  },
  articleBlockquote: { en: "It is the digital operational heartbeat of the building.", el: "Είναι ο ψηφιακός λειτουργικός παλμός του κτηρίου." },
  articleH2Why: { en: "Why Shrine Ops Matters", el: "Γιατί το Shrine Ops Έχει Σημασία" },
  articleWhy: {
    en: "Before a platform like this, daily operations can easily become scattered across paper notes, text messages, spreadsheets, radio calls, verbal updates, and separate files. Shrine Ops simplifies that by giving staff and leadership one trusted place to work from.",
    el: "Πριν από μια τέτοια πλατφόρμα, οι λειτουργίες ήταν διάσπαρτες σε σημειώσεις, μηνύματα, φύλλα και κλήσεις. Το Shrine Ops τα ενοποιεί όλα σε ένα αξιόπιστο σημείο.",
  },
  articleWhy2: {
    en: "The app connects the most important parts of daily operations: clock-in and shift tracking, payroll reporting, maintenance tickets, walkthroughs, incident reporting, staff messaging, daily briefings, event readiness, manager alerts, and employee recognition.",
    el: "Η εφαρμογή συνδέει τις πιο σημαντικές πλευρές των λειτουργιών: παρακολούθηση βαρδιών, μισθοδοσία, δελτία συντήρησης, επιθεωρήσεις, αναφορές, μηνύματα, ενημερώσεις, ετοιμότητα εκδηλώσεων, ειδοποιήσεις και αναγνώριση.",
  },
  articleH2One: { en: "One Source of Truth", el: "Μία Πηγή Αλήθειας" },
  articleOne: { en: "Shrine Ops is designed to answer simple but important questions quickly:", el: "Το Shrine Ops απαντά γρήγορα σε απλές αλλά σημαντικές ερωτήσεις:" },
  articleQ1: { en: "Who is on site?", el: "Ποιος είναι στον χώρο;" },
  articleQ2: { en: "What events are happening today?", el: "Ποιες εκδηλώσεις γίνονται σήμερα;" },
  articleQ3: { en: "What issues need attention?", el: "Ποια ζητήματα χρειάζονται προσοχή;" },
  articleQ4: { en: "Which tickets are open or resolved?", el: "Ποια δελτία είναι ανοιχτά ή έχουν επιλυθεί;" },
  articleQ5: { en: "Have walkthroughs been completed?", el: "Έχουν ολοκληρωθεί οι επιθεωρήσεις;" },
  articleQ6: { en: "Are there staffing gaps?", el: "Υπάρχουν κενά στελέχωσης;" },
  articleQ7: { en: "What needs to be reported for payroll?", el: "Τι πρέπει να αναφερθεί για μισθοδοσία;" },
  articleQ8: { en: "Which employees are going above and beyond?", el: "Ποιοι εργαζόμενοι ξεπερνούν τις προσδοκίες;" },
  articleH2Payroll: { en: "Payroll and Reporting Made Cleaner", el: "Καθαρότερη Μισθοδοσία και Αναφορές" },
  articlePayroll: { en: "The platform helps organize employee shift information and payroll summaries by pay period. Managers can review hours, overtime flags, pay summaries, and shift history without manually piecing everything together from separate sources.", el: "Η πλατφόρμα οργανώνει πληροφορίες βαρδιών και μισθοδοσίας ανά περίοδο. Η διοίκηση εξετάζει ώρες, υπερωρίες και ιστορικό βαρδιών χωρίς χειροκίνητη συγκέντρωση." },
  articlePayroll2: { en: "Beyond payroll, Shrine Ops also supports monthly operational reporting. Maintenance activity, incidents, visitor trends, staff hours, and completed work can be reviewed in one place so leadership has a clearer picture of what is happening inside the building.", el: "Πέρα από τη μισθοδοσία, το Shrine Ops υποστηρίζει μηνιαίες αναφορές. Συντήρηση, περιστατικά, τάσεις επισκεπτών, ώρες προσωπικού και ολοκληρωμένη εργασία εξετάζονται σε ένα σημείο." },
  articleH2Comms: { en: "Better Communication for the Whole Team", el: "Καλύτερη Επικοινωνία για Όλη την Ομάδα" },
  articleComms: { en: "Shrine Ops includes direct messages, group communication, broadcast messages, alerts, and daily briefings. This helps everyone stay aligned throughout the day and reduces the confusion that comes from fragmented communication.", el: "Το Shrine Ops περιλαμβάνει άμεσα μηνύματα, ομαδική επικοινωνία, ανακοινώσεις, ειδοποιήσεις και ημερήσιες ενημερώσεις. Όλοι παραμένουν ευθυγραμμισμένοι κατά τη διάρκεια της ημέρας." },
  articleH2Recog: { en: "Recognition Built Into the System", el: "Αναγνώριση Ενσωματωμένη στο Σύστημα" },
  articleRecog: { en: "The app also includes an employee recognition program designed to build morale and reward consistency. Employees can earn points and badges for meaningful contributions such as completing walkthroughs, resolving tickets, arriving on time, supporting events, and helping maintain the Shrine at a high standard.", el: "Η εφαρμογή περιλαμβάνει πρόγραμμα αναγνώρισης για ενίσχυση ηθικού και επιβράβευση συνέπειας. Οι εργαζόμενοι κερδίζουν πόντους και σήματα για ουσιαστικές συνεισφορές." },
  articleRecog2: { en: "The recognition leaderboard, badge collection, and Employee of the Month features help reinforce positive culture and show staff that their work is seen and valued.", el: "Η κατάταξη, η συλλογή σημάτων και ο Εργαζόμενος του Μήνα ενισχύουν τη θετική κουλτούρα και δείχνουν ότι η εργασία αναγνωρίζεται." },
  articleH2Future: { en: "A Stronger Operational Future", el: "Ένα Ισχυρότερο Λειτουργικό Μέλλον" },
  articleFuture: { en: "Shrine Ops gives the National Shrine a modern foundation for daily operations. It supports accountability without making the work feel complicated. It gives leadership visibility without creating more paperwork. It helps employees stay informed, recognized, and connected.", el: "Το Shrine Ops δίνει στο Εθνικό Ιερό μια σύγχρονη βάση. Υποστηρίζει υπευθυνότητα χωρίς πολυπλοκότητα. Δίνει ορατότητα χωρίς γραφειοκρατία." },
  articleFuture2: { en: "Most importantly, it helps the Shrine operate with clarity, consistency, and care.", el: "Πιο σημαντικό, βοηθά το Ιερό να λειτουργεί με σαφήνεια, συνέπεια και φροντίδα." },
} as const

export type MarketingStringKey = keyof typeof marketingStrings
