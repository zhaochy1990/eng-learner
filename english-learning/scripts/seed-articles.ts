import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'app.db');

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create schema — matches src/lib/db.ts initializeSchema
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    difficulty TEXT NOT NULL DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    category TEXT NOT NULL DEFAULT 'general',
    source_url TEXT,
    word_count INTEGER NOT NULL DEFAULT 0,
    reading_time INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reading_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL UNIQUE,
    scroll_position REAL NOT NULL DEFAULT 0,
    current_sentence INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    last_read_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS vocabulary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL UNIQUE COLLATE NOCASE,
    phonetic TEXT,
    translation TEXT NOT NULL,
    pos TEXT,
    definition TEXT,
    context_sentence TEXT,
    context_article_id INTEGER,
    mastery_level INTEGER NOT NULL DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 3),
    next_review_at TEXT NOT NULL DEFAULT (datetime('now')),
    review_count INTEGER NOT NULL DEFAULT 0,
    last_reviewed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (context_article_id) REFERENCES articles(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_vocabulary_word ON vocabulary(word);
  CREATE INDEX IF NOT EXISTS idx_vocabulary_next_review ON vocabulary(next_review_at);
  CREATE INDEX IF NOT EXISTS idx_vocabulary_mastery ON vocabulary(mastery_level);
  CREATE INDEX IF NOT EXISTS idx_reading_progress_article ON reading_progress(article_id);
`);

const seedArticles = [
  {
    title: "The Future of Remote Work",
    content: `Remote work has fundamentally transformed the way we think about employment. What was once a rare perk offered by forward-thinking companies has become the norm for millions of workers worldwide. The COVID-19 pandemic accelerated this shift dramatically, forcing organizations to adapt virtually overnight.

The benefits of remote work are well-documented. Employees enjoy greater flexibility, eliminating long commutes and gaining more time for personal pursuits. Companies benefit from reduced overhead costs and access to a broader talent pool unconstrained by geography. Studies consistently show that remote workers report higher job satisfaction and, in many cases, increased productivity.

However, remote work is not without its challenges. Many workers struggle with isolation and the blurring of boundaries between professional and personal life. Communication can become fragmented, and the spontaneous interactions that fuel creativity and innovation are harder to replicate through video calls and messaging platforms.

Organizations are increasingly adopting hybrid models that attempt to capture the best of both worlds. These arrangements typically allow employees to work from home several days a week while maintaining regular in-office presence for collaboration, team building, and mentorship opportunities.

The technology infrastructure supporting remote work continues to evolve. Cloud-based collaboration tools, project management platforms, and virtual meeting solutions have become increasingly sophisticated. Artificial intelligence is being integrated into these tools to enhance productivity, automate routine tasks, and provide insights into team dynamics.

Looking ahead, the future of work will likely be defined by flexibility rather than rigid adherence to any single model. Successful organizations will be those that can adapt their policies to meet the diverse needs of their workforce while maintaining a cohesive company culture and driving innovation.`,
    summary: "An exploration of how remote work has transformed employment, covering benefits, challenges, and the evolution toward hybrid work models.",
    difficulty: "intermediate",
    category: "business",
  },
  {
    title: "Understanding Artificial Intelligence",
    content: `Artificial intelligence, commonly known as AI, refers to the simulation of human intelligence by machines that are programmed to think and learn like humans. The term was first coined in 1956, but AI has become more popular today thanks to increased data volumes, advanced algorithms, and improvements in computing power and storage.

At its core, AI works by combining large amounts of data with fast, iterative processing and intelligent algorithms. This allows the software to learn automatically from patterns and features in the data. AI is a broad field of study that includes many theories, methods, and technologies.

Machine learning is a subset of AI that provides systems the ability to automatically learn and improve from experience without being explicitly programmed. Deep learning is a subset of machine learning that uses neural networks with many layers to analyze various factors of data.

Natural language processing enables computers to understand, interpret, and generate human language. This technology powers applications like virtual assistants, translation services, and sentiment analysis tools. Recent advances in large language models have dramatically expanded what is possible with natural language processing.

Computer vision allows machines to interpret and make decisions based on visual data from the world. Applications range from facial recognition and medical image analysis to autonomous vehicles and quality control in manufacturing.

The ethical implications of AI are significant and widely debated. Concerns include job displacement, privacy, bias in algorithms, and the potential for autonomous weapons. Responsible AI development requires careful consideration of these issues and the establishment of appropriate governance frameworks.

Despite these concerns, AI continues to offer tremendous potential for solving complex problems in healthcare, climate science, education, and many other fields. The key lies in developing AI systems that are transparent, fair, and aligned with human values.`,
    summary: "A comprehensive introduction to artificial intelligence, covering its core concepts, subfields like machine learning and NLP, and ethical considerations.",
    difficulty: "intermediate",
    category: "tech",
  },
  {
    title: "A Guide to Healthy Eating",
    content: `Eating well is one of the most important things you can do for your health. Good food gives your body the energy and nutrients it needs to work properly. But with so much information about diets and nutrition, it can be hard to know what to eat.

The basics of healthy eating are simple. Try to eat plenty of fruits and vegetables every day. They are rich in vitamins and minerals that keep your body strong. Whole grains like brown rice, oats, and whole wheat bread provide energy and fiber.

Protein is important for building and repairing your body. Good sources of protein include fish, chicken, beans, and eggs. Try to limit red meat and processed foods, as eating too much of these can be bad for your heart.

Water is essential for good health. Your body needs water to function properly. Try to drink at least eight glasses of water each day. Avoid sugary drinks like soda and juice, which can add extra calories without providing nutrition.

It is also important to pay attention to how much you eat. Even healthy foods can cause weight gain if you eat too much. Using smaller plates and eating slowly can help you eat the right amount.

Planning your meals ahead of time can make healthy eating easier. When you plan what you will eat for the week, you are less likely to choose unhealthy options. Cooking at home also gives you more control over what goes into your food.

Remember, healthy eating does not mean you can never enjoy your favorite treats. The key is balance. Eat well most of the time, and it is perfectly fine to have a piece of cake or some chips once in a while.`,
    summary: "Simple and practical tips for maintaining a healthy diet, covering food groups, hydration, portion control, and meal planning.",
    difficulty: "beginner",
    category: "daily",
  },
  {
    title: "The Art of Effective Communication in the Workplace",
    content: `Effective communication is the cornerstone of professional success. In today's interconnected business environment, the ability to convey ideas clearly and persuasively has become an indispensable skill that distinguishes exceptional professionals from their peers.

Verbal communication extends far beyond simply speaking words. It encompasses tone, pace, and the strategic use of pauses. When presenting to stakeholders, for instance, modulating your voice to emphasize key points can significantly enhance the impact of your message. Active listening—fully concentrating on what is being said rather than merely hearing the words—is equally crucial for meaningful dialogue.

Written communication in professional contexts demands precision and clarity. Emails, reports, and proposals should be structured logically, with a clear purpose stated upfront. The proliferation of digital communication channels has made conciseness particularly valuable; lengthy messages risk losing the reader's attention and obscuring important information.

Cross-cultural communication presents unique challenges in multinational organizations. What constitutes directness or politeness varies significantly across cultures. Some cultures value explicit, straightforward communication, while others rely heavily on context and implicit understanding. Developing cultural intelligence is essential for navigating these nuances effectively.

Non-verbal communication—including body language, facial expressions, and eye contact—accounts for a substantial portion of human interaction. In virtual meetings, where non-verbal cues are limited, professionals must be more deliberate about using visual aids, maintaining camera engagement, and verbally acknowledging participants.

Feedback is a critical component of workplace communication. Constructive feedback should be specific, timely, and focused on behavior rather than personality. The ability to both give and receive feedback gracefully facilitates continuous improvement and strengthens professional relationships.

Mastering workplace communication is an ongoing journey rather than a destination. Regular self-reflection, seeking feedback on your communication style, and staying attuned to evolving norms and technologies will ensure your skills remain sharp and relevant.`,
    summary: "Comprehensive guide to workplace communication, covering verbal, written, cross-cultural, and non-verbal communication strategies.",
    difficulty: "advanced",
    category: "business",
  },
  {
    title: "Getting Started with Cloud Computing",
    content: `Cloud computing has revolutionized how businesses and individuals use technology. Instead of buying and maintaining physical servers and hardware, you can access computing resources over the internet, paying only for what you use.

There are three main types of cloud services. Infrastructure as a Service, or IaaS, provides basic computing resources like virtual machines, storage, and networking. Platform as a Service, or PaaS, offers a platform for developers to build and deploy applications without managing the underlying infrastructure. Software as a Service, or SaaS, delivers ready-to-use applications over the internet, such as email and office productivity tools.

The major cloud providers are Amazon Web Services, Microsoft Azure, and Google Cloud Platform. Each offers a wide range of services, from simple storage solutions to advanced machine learning tools. Choosing the right provider depends on your specific needs, budget, and technical requirements.

Security is a top concern for organizations moving to the cloud. Cloud providers invest heavily in security measures, often exceeding what most organizations can achieve on their own. However, security is a shared responsibility. While the provider secures the infrastructure, customers must properly configure their services and manage access controls.

Cloud computing offers several key advantages. Scalability allows you to quickly increase or decrease resources based on demand. Cost efficiency is achieved through the pay-as-you-go model, eliminating large upfront investments. Reliability is enhanced through redundant systems spread across multiple data centers.

Migration to the cloud requires careful planning. Organizations should assess their current infrastructure, identify which workloads are suitable for the cloud, and develop a phased migration strategy. Training staff and updating processes are equally important for a successful transition.

The cloud computing landscape continues to evolve rapidly, with emerging technologies like serverless computing, edge computing, and multi-cloud strategies shaping the future of how we build and deploy technology solutions.`,
    summary: "Introduction to cloud computing concepts, service models (IaaS, PaaS, SaaS), major providers, security considerations, and migration strategies.",
    difficulty: "intermediate",
    category: "tech",
  },
  {
    title: "Daily English: Ordering Food at a Restaurant",
    content: `Going to a restaurant in an English-speaking country can feel scary at first, but knowing some basic phrases will help you feel more confident. Let us walk through a typical restaurant visit.

When you arrive at the restaurant, the host will greet you. They might say "How many in your party?" This means they want to know how many people will be eating. You can reply with "Just one" or "Two, please" or whatever number is correct.

Once you are seated, the waiter will bring you a menu and might ask "Can I get you something to drink?" You can order water, juice, coffee, or any other drink. If you need more time, just say "I need a few more minutes, please."

When you are ready to order food, the waiter will ask "Are you ready to order?" or "What can I get for you?" You can point to items on the menu and say "I would like the chicken salad, please" or "Could I have the pasta?" If you have questions about the food, ask "What do you recommend?" or "Does this dish contain nuts?"

During the meal, the waiter might check on you and ask "How is everything?" If the food is good, you can say "Everything is great, thank you." If you need something, like more water or extra napkins, just ask politely.

When you are finished eating, you can ask for the bill by saying "Could I have the check, please?" In the United States, it is customary to leave a tip of about fifteen to twenty percent of the total bill. You can pay with cash or a credit card.

If you have any dietary restrictions, it is important to mention them early. You might say "I am vegetarian" or "I am allergic to shellfish." Most restaurants are happy to accommodate special dietary needs if you let them know.

Practice these phrases before your next restaurant visit, and you will find the experience much more enjoyable!`,
    summary: "Practical English phrases and etiquette for ordering food at restaurants, from arrival to paying the bill.",
    difficulty: "beginner",
    category: "daily",
  },
  {
    title: "Global Economic Trends in the Digital Age",
    content: `The global economy is undergoing a profound transformation driven by digital technologies, shifting geopolitical dynamics, and evolving consumer behavior. Understanding these trends is essential for professionals navigating an increasingly complex business landscape.

The digital economy now accounts for a substantial and growing share of global GDP. E-commerce has reshaped retail, with online sales consistently outpacing traditional brick-and-mortar growth. The pandemic dramatically accelerated digital adoption, compressing years of expected progress into months. This digital acceleration has created new opportunities while simultaneously disrupting established industries and business models.

Cryptocurrency and decentralized finance represent a paradigmatic shift in how we conceptualize money and financial transactions. While volatility and regulatory uncertainty remain significant concerns, blockchain technology continues to find applications in supply chain management, intellectual property protection, and cross-border payments. Central banks worldwide are exploring digital currencies as a means of modernizing monetary policy tools.

The gig economy has fundamentally altered labor markets across developed nations. Platforms connecting freelancers with clients have created unprecedented flexibility but also raised questions about worker protections, benefits, and the sustainability of non-traditional employment arrangements. Policymakers are grappling with how to regulate these platforms without stifling innovation.

Supply chain resilience has emerged as a critical priority following the disruptions of recent years. Companies are diversifying their supplier networks, investing in predictive analytics, and exploring nearshoring strategies to reduce vulnerability to geopolitical risks and natural disasters. The concept of "just-in-time" manufacturing is being complemented by "just-in-case" inventory strategies.

Environmental, Social, and Governance considerations have moved from the periphery to the center of corporate strategy. Investors increasingly evaluate companies through an ESG lens, and sustainable business practices are becoming a competitive differentiator rather than merely a compliance requirement.

The intersection of these trends—digitalization, financial innovation, labor market evolution, supply chain transformation, and sustainability—is creating a new economic paradigm that demands adaptability, continuous learning, and strategic foresight from professionals and organizations alike.`,
    summary: "Analysis of major global economic trends including digital transformation, cryptocurrency, gig economy, supply chain resilience, and ESG considerations.",
    difficulty: "advanced",
    category: "news",
  },
];

const insertStmt = db.prepare(`
  INSERT INTO articles (title, content, summary, difficulty, category, word_count, reading_time)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// Check if articles already exist
const count = (db.prepare('SELECT COUNT(*) as count FROM articles').get() as { count: number }).count;
if (count > 0) {
  console.log(`Database already has ${count} articles. Skipping seed.`);
} else {
  const insertMany = db.transaction((articles: typeof seedArticles) => {
    for (const article of articles) {
      const wordCount = article.content.split(/\s+/).filter(Boolean).length;
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));
      insertStmt.run(
        article.title,
        article.content,
        article.summary,
        article.difficulty,
        article.category,
        wordCount,
        readingTime
      );
    }
  });

  insertMany(seedArticles);
  console.log(`Seeded ${seedArticles.length} articles successfully.`);
}

db.close();
