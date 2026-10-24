# Item: chapter 12 «ovunque» + lab «git»

Your files: `js/capitoli/12-ovunque.js`, `js/lab/git.js`, `js/figure/ovunque.js`, `test/git.test.js`.
Keep: id 'ovunque', numero 12, anni '2001–2020', titolo 'Software ovunque', sottotitolo 'Metodi agili, Git, smartphone e cloud', epoca 'editor'.

## Content to cover (verify)
- The Agile Manifesto (Snowbird, Utah, 11–13 February 2001, 17 signatories) and its four values (translate faithfully); Extreme Programming (Kent Beck, 1999), Scrum (Schwaber and Sutherland, 1995); tests first, pair programming, short iterations.
- Version control: SCCS (1972), RCS (1982), CVS, Subversion (2000), BitKeeper and the Linux kernel; Git (Linus Torvalds, April 2005, written in a few weeks; verify the dates), distributed; GitHub (2008; acquired by Microsoft in 2018); pull requests; Stack Overflow (2008).
- Mobile: iPhone (announced 9 January 2007), App Store (10 July 2008), Android (first phone in autumn 2008); Swift (2014) replacing Objective-C; Kotlin (JetBrains 2011, 1.0 in 2016, official on Android 2017).
- Cloud: Amazon S3 and EC2 (2006); virtualization; Docker (2013); Kubernetes (2014); DevOps (Patrick Debois, 2009); continuous integration and delivery; APIs; microservices.
- New languages: C# and .NET (2000–2002), Go (announced November 2009; Griesemer, Pike, Thompson), Rust (Graydon Hoare 2006, Mozilla, 1.0 in May 2015: memory safety without a garbage collector), TypeScript (2012), Node.js (2009) taking JavaScript to servers.
- Open source wins: from proprietary to shared infrastructure.
- Bridge to hardware: smartphones are pocket computers with ARM chips (link `../chip-programmabili/index.html` or `../storia-pc/index.html`); data centers.

Suggested flow: testo (2001: the manifesto), citazione (the four values, verified), testo (version control: why), lab git, testo (Git and GitHub), testo (smartphones and apps), figura smartphone-app, testo (cloud and containers), figura cloud, testo (new languages; a `tabella` year/author/idea), sapevi, ciao.

`ciao`: { anno: 2015, linguaggio: 'Rust' (or Go/Swift, your choice), file: 'main.rs', codice: 'fn main() {\n    println!("Ciao, mondo!");\n}', comandi: ['$ cargo run'], uscita: 'Ciao, mondo!', nota }.
Protagonisti: Kent Beck, Linus Torvalds, Rob Pike, Graydon Hoare, Chris Lattner, Solomon Hykes (6 cards).
Glossary terms you own: sviluppo agile, controllo di versione, commit, branch, merge, repository, app, cloud, container, API, integrazione continua, sicurezza della memoria.

## Lab «git» (title: «Git, la macchina del tempo del codice»)
- An animated commit graph (DAG): commits as nodes on lanes per branch, branch labels, HEAD marker. Start with a repository `ricetta` with 2 commits on `main`.
- Actions (buttons): «Commit» (adds a commit on the current branch with an automatic message and a tiny change to the file), «Nuovo branch», «Cambia branch» (select), «Merge» (merge another branch into the current one: fast-forward if possible, else a merge commit with two parents; conflicts out of scope), «Annulla» (undo the last action).
- A file panel shows `ricetta.txt` at the selected commit: clicking any commit shows its snapshot (time travel); differences from its parent highlighted (+ green / − red lines).
- A command log shows the equivalent git commands (`git commit -m "…"`, `git switch -c nuova-salsa`, `git merge nuova-salsa`).
- A guided story «Due persone, un progetto» with ▶: Anna creates a branch for a new sauce, Luca fixes the dough on main, then they merge; each step narrated in `.pg-spiega`.
- Smooth layout animations when nodes are added (transform-based).
- `ctx.completa()` after the first merge.
- Export the repository model (commits, parents, branches, HEAD, merge base, fast-forward detection, snapshots); test it.

## Figures (`js/figure/ovunque.js`)
- `smartphone-app`: a smartphone with an app grid; a finger tap opens an app with a zoom (subtle).
- `cloud`: racks in a data center with containers being shipped onto servers, linked to phones and laptops.
