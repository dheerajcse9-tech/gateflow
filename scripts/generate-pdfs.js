const puppeteer = require('/opt/homebrew/lib/node_modules/puppeteer-cli/node_modules/puppeteer');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', 'public', 'revision-sheets');

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #fff; color: #1a1a1a; font-size: 11px; line-height: 1.55; }
  .cover { height: 100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding:40px; }
  .cover-logo { width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:36px; color:#fff; margin-bottom:24px; }
  .cover h1 { font-size:36px; font-weight:900; color:#1a1a1a; line-height:1.2; margin-bottom:8px; }
  .cover h2 { font-size:18px; font-weight:500; color:#6b7280; margin-bottom:24px; }
  .cover .badge { display:inline-block; padding:6px 16px; border-radius:100px; font-size:12px; font-weight:700; color:#fff; margin-bottom:32px; }
  .cover .meta { font-size:11px; color:#9ca3af; }
  .cover .brand { margin-top:auto; font-size:13px; font-weight:700; color:#FF7A18; }
  .page { padding:28px 32px; }
  .page-header { display:flex; align-items:center; gap:12px; padding-bottom:14px; border-bottom:3px solid; margin-bottom:18px; }
  .page-header .icon { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:900; font-size:16px; }
  .page-header h1 { font-size:22px; font-weight:900; flex:1; }
  .page-header .tag { font-size:10px; font-weight:700; padding:3px 10px; border-radius:100px; color:#fff; }
  .section { margin-bottom:18px; break-inside:avoid; }
  .section-title { font-size:13px; font-weight:800; padding:5px 10px; border-radius:6px; margin-bottom:8px; color:#fff; display:inline-block; }
  .section-body { padding-left:12px; border-left:3px solid; }
  .topic { margin-bottom:7px; }
  .topic-name { font-size:11px; font-weight:700; color:#1a1a1a; }
  .topic ul { margin: 3px 0 0 14px; list-style:disc; }
  .topic ul li { font-size:10px; color:#374151; margin-bottom:2px; }
  table { width:100%; border-collapse:collapse; margin:8px 0; font-size:10px; }
  th { background:#f3f4f6; padding:5px 8px; text-align:left; font-weight:700; border:1px solid #e5e7eb; }
  td { padding:4px 8px; border:1px solid #e5e7eb; vertical-align:top; }
  tr:nth-child(even) td { background:#fafafa; }
  .footer { text-align:center; font-size:9px; color:#9ca3af; margin-top:20px; padding-top:10px; border-top:1px solid #e5e7eb; }
`;

const SUBJECTS = [
  {
    id: 'engg-math',
    title: 'Engineering Mathematics',
    icon: 'M',
    color: '#7C3AED',
    lightColor: '#EDE9FE',
    sections: [
      { name: 'Mathematical Logic', topics: [
        { name: 'Propositional Logic', points: ['Connectives: NOT, AND, OR, IMPLIES, IFF','Tautology, Contradiction, Contingency','De Morgan Laws: NOT(P AND Q) = NOT P OR NOT Q','Precedence: NOT > AND > OR > IMPLIES > IFF'] },
        { name: 'First Order Logic', points: ['Universal quantifier: for all x P(x)','Existential quantifier: there exists x P(x)','Rules of Inference: Modus Ponens, Modus Tollens, Resolution','Predicate logic extends propositional with quantifiers'] },
      ]},
      { name: 'Set Theory & Algebra', topics: [
        { name: 'Sets & Relations', points: ['Power Set of A with n elements has 2^n elements','Cartesian Product: |AxB| = |A| x |B|','Equivalence Relation: Reflexive + Symmetric + Transitive','Partial Order: Reflexive + Antisymmetric + Transitive','POSET, Hasse Diagrams, Lattices'] },
        { name: 'Functions', points: ['Injective (1-1): f(a)=f(b) implies a=b','Surjective (onto): every element of codomain is mapped','Bijective = Injective + Surjective','Inverse function exists iff function is bijective'] },
      ]},
      { name: 'Combinatorics', topics: [
        { name: 'Counting', points: ['Permutations: nPr = n!/(n-r)!','Combinations: nCr = n!/r!(n-r)!','Inclusion-Exclusion: |AuB| = |A|+|B|-|AnB|','Pigeonhole: n+1 items in n boxes => 1 box has >= 2'] },
        { name: 'Recurrences', points: ['Master Theorem: T(n) = aT(n/b) + f(n)','Case 1: f(n) = O(n^(logb(a)-e)) => T(n) = Theta(n^logb(a))','Case 2: f(n) = Theta(n^logb(a)) => T(n) = Theta(n^logb(a) logn)','Case 3: f(n) = Omega(n^(logb(a)+e)) => T(n) = Theta(f(n))'] },
      ]},
      { name: 'Probability', topics: [
        { name: 'Probability Rules', points: ["P(AuB) = P(A)+P(B)-P(AnB)","P(A|B) = P(AnB)/P(B)","Bayes Theorem: P(A|B) = P(B|A)*P(A)/P(B)","Independent events: P(AnB) = P(A)*P(B)"] },
        { name: 'Distributions', points: ['Binomial: P(X=k) = C(n,k) * p^k * (1-p)^(n-k)','Expected value E[X] = sum of x*P(x)','Variance Var(X) = E[X^2] - (E[X])^2','Normal distribution: mean=mu, std dev=sigma'] },
      ]},
      { name: 'Linear Algebra', topics: [
        { name: 'Matrices', points: ['Rank = number of linearly independent rows/columns','det(AB) = det(A)*det(B)','Inverse exists iff det(A) != 0','Rank-Nullity: rank(A) + nullity(A) = n (columns)'] },
        { name: 'Eigenvalues', points: ['Characteristic equation: det(A - lambda*I) = 0','Sum of eigenvalues = Trace(A)','Product of eigenvalues = det(A)','Cayley-Hamilton: matrix satisfies its own characteristic equation'] },
      ]},
      { name: 'Graph Theory', topics: [
        { name: 'Key Theorems', points: ['Handshaking Lemma: Sum of degrees = 2|E|','Tree: connected, acyclic, |E| = |V|-1','Euler Circuit: all vertices have even degree','Hamilton Path: visits every vertex exactly once','Planar Graph: |E| <= 3|V| - 6 (Euler formula V-E+F=2)','Complete graph Kn has n*(n-1)/2 edges'] },
      ]},
    ],
  },
  {
    id: 'digital-logic',
    title: 'Digital Logic',
    icon: 'DL',
    color: '#B45309',
    lightColor: '#FEF3C7',
    sections: [
      { name: 'Number Systems', topics: [
        { name: 'Conversions & Codes', points: ['Binary to Decimal: use positional weights','Hex to Binary: expand each hex digit to 4 bits','BCD: 4 bits per decimal digit (0-9 only valid)','Gray Code: G[n] = B[n] XOR B[n-1]','1s Complement: invert all bits','2s Complement: invert all bits then add 1','Range of n-bit 2s complement: -2^(n-1) to 2^(n-1)-1'] },
      ]},
      { name: 'Boolean Algebra', topics: [
        { name: 'Laws', points: ['Identity: A+0=A, A.1=A','Null: A+1=1, A.0=0','Idempotent: A+A=A, A.A=A','Complement: A+A=1, A.A=0','Absorption: A+AB=A, A(A+B)=A','De Morgan: (A+B)=AB, (AB)=A+B'] },
        { name: 'K-Map', points: ['Groups must be powers of 2 (1,2,4,8...)','Wrap-around allowed','Largest groups give minimal expression','SOP: group 1s | POS: group 0s','Dont-care cells can be used in grouping'] },
      ]},
      { name: 'Combinational Circuits', topics: [
        { name: 'Adders & Multiplexers', points: ['Half Adder: Sum = A XOR B, Carry = A.B','Full Adder: Sum = A XOR B XOR Cin, Cout = majority(A,B,Cin)','2-to-1 MUX: Y = S.B + S.A','MUX can implement any boolean function','n:2^n Decoder, 2^n:n Encoder'] },
      ]},
      { name: 'Sequential Circuits', topics: [
        { name: 'Flip-Flops', points: ['SR: forbidden state R=S=1, Q+ = S + R.Q','D: Q+ = D (most common, no race condition)','JK: Q+ = J.Q + K.Q (J=K=1 toggles)','T: Q+ = T XOR Q (T=1 toggles, T=0 holds)'] },
        { name: 'FSM', points: ['Mealy: output depends on state AND input','Moore: output depends only on current state','State minimization merges equivalent states','Steps: state table -> K-map -> circuit'] },
      ]},
    ],
  },
  {
    id: 'coa',
    title: 'Computer Organization & Architecture',
    icon: 'CO',
    color: '#0369A1',
    lightColor: '#DBEAFE',
    sections: [
      { name: 'Instruction Set Architecture', topics: [
        { name: 'Addressing Modes', points: ['Immediate: operand IS the value','Register: value in register','Direct: EA = address field','Indirect: EA = Memory[address field]','Register Indirect: EA = content of register','Indexed: EA = Base + Index register','Relative: EA = PC + offset'] },
        { name: 'RISC vs CISC', points: ['RISC: fixed length, load-store, many registers, pipelining friendly','CISC: variable length, complex ops, fewer registers','RISC: MIPS, ARM, SPARC | CISC: x86, x64'] },
      ]},
      { name: 'Pipelining', topics: [
        { name: 'Performance & Hazards', points: ['Ideal CPI = 1 with k-stage pipeline','Speedup = n*k / (k + n - 1) for n instructions','CPI = 1 + stall cycles per instruction','Structural Hazard: resource conflict -> stall/duplicate','Data Hazard RAW: forwarding or stall','Control Hazard: branch -> predict or delayed branch','Forwarding: bypass result to next stage without writing to reg'] },
      ]},
      { name: 'Memory Hierarchy', topics: [
        { name: 'Cache', points: ['Direct Mapped: block maps to exactly one cache line','Set Associative: k-way means k possible locations','Fully Associative: any block can go anywhere','Write Through: update cache AND memory','Write Back: update only cache, write to memory on eviction','AMAT = Hit time + Miss rate * Miss penalty'] },
        { name: 'Virtual Memory', topics: ['Page Table: VPN to PFN mapping','TLB is a cache for page table lookups','Page Fault: OS loads page from disk','Thrashing: excessive page faults, working set model'] },
      ]},
      { name: 'Number Representation & I/O', topics: [
        { name: 'IEEE 754', points: ['Single precision: 1 sign + 8 exp + 23 mantissa','Double precision: 1 sign + 11 exp + 52 mantissa','Bias: 127 (single), 1023 (double)','Value = (-1)^S * 1.mantissa * 2^(exp-bias)'] },
        { name: 'I/O', points: ['Polling: CPU checks device status in loop','Interrupt: device notifies CPU when ready','DMA: device transfers data directly to memory','Memory-mapped I/O vs Isolated I/O'] },
      ]},
    ],
  },
  {
    id: 'ds-algo',
    title: 'Data Structures & Algorithms',
    icon: 'DS',
    color: '#065F46',
    lightColor: '#D1FAE5',
    sections: [
      { name: 'Sorting Algorithms', table: {
        headers: ['Algorithm', 'Best', 'Average', 'Worst', 'Space', 'Stable'],
        rows: [
          ['Bubble', 'O(n)', 'O(n2)', 'O(n2)', 'O(1)', 'Yes'],
          ['Selection', 'O(n2)', 'O(n2)', 'O(n2)', 'O(1)', 'No'],
          ['Insertion', 'O(n)', 'O(n2)', 'O(n2)', 'O(1)', 'Yes'],
          ['Merge', 'O(nlogn)', 'O(nlogn)', 'O(nlogn)', 'O(n)', 'Yes'],
          ['Quick', 'O(nlogn)', 'O(nlogn)', 'O(n2)', 'O(logn)', 'No'],
          ['Heap', 'O(nlogn)', 'O(nlogn)', 'O(nlogn)', 'O(1)', 'No'],
          ['Counting', 'O(n+k)', 'O(n+k)', 'O(n+k)', 'O(k)', 'Yes'],
        ],
      }},
      { name: 'Tree Data Structures', topics: [
        { name: 'BST & AVL', points: ['BST: inorder = sorted, ops O(h)','AVL: |h_left - h_right| <= 1, ops O(logn)','AVL rotations: LL, RR, LR, RL','Red-Black Tree: also O(logn), used in C++ STL'] },
        { name: 'Heap & B-Tree', points: ['Max-Heap: parent >= children; Min-Heap: parent <= children','Build heap: O(n); Insert/Delete: O(logn)','B-Tree of order m: max m children, min ceil(m/2) children','B+ Tree: all data in leaves, internal nodes for routing','B+ Tree supports range queries efficiently'] },
      ]},
      { name: 'Graph Algorithms', topics: [
        { name: 'Traversal & Shortest Path', points: ['BFS: O(V+E), uses queue, shortest path in unweighted graph','DFS: O(V+E), used for topological sort, SCC, cycle detection','Dijkstra: O((V+E)logV), no negative edges','Bellman-Ford: O(VE), handles negative edges, detects cycles','Floyd-Warshall: O(V3), all-pairs shortest path'] },
        { name: 'MST & Connectivity', points: ["Kruskal: sort edges + Union-Find = O(E logE)"," Prim: O(E logV) with min-heap, grow tree greedily","Both give same MST cost, MST has exactly V-1 edges","SCC: Kosaraju (2 DFS) or Tarjan algorithm","Topological sort only for DAGs (DFS or Kahn's BFS)"] },
      ]},
      { name: 'Dynamic Programming', topics: [
        { name: 'Classic DP Problems', points: ['0/1 Knapsack: dp[i][w] = max(no include, include item i)','LCS(s,t): dp[i][j] = dp[i-1][j-1]+1 if s[i]==t[j], else max(dp[i-1][j], dp[i][j-1])','Edit Distance: min(insert, delete, replace) operations','Matrix Chain: minimize multiplications, O(n^3)','Coin Change: min coins to make amount = dp[amount]'] },
      ]},
    ],
  },
  {
    id: 'toc',
    title: 'Theory of Computation',
    icon: 'TC',
    color: '#166534',
    lightColor: '#D1FAE5',
    sections: [
      { name: 'Chomsky Hierarchy', table: {
        headers: ['Type', 'Language', 'Machine', 'Closed Under'],
        rows: [
          ['Type 3', 'Regular', 'DFA/NFA', 'Union, Concat, Star, Complement, Intersection'],
          ['Type 2', 'Context-Free', 'PDA', 'Union, Concat, Star (NOT complement/intersection)'],
          ['Type 1', 'Context-Sensitive', 'LBA', 'All boolean ops'],
          ['Type 0', 'Recursively Enum.', 'TM', 'Union, Concat, Star'],
        ],
      }},
      { name: 'Finite Automata', topics: [
        { name: 'DFA & NFA', points: ['DFA: 5-tuple (Q, Sigma, delta, q0, F), deterministic','NFA to DFA: subset construction, max 2^n DFA states','e-NFA: NFA with epsilon transitions','Epsilon-closure: states reachable via epsilon only','Both DFA and NFA recognize exactly regular languages'] },
        { name: 'Minimization & Pumping', points: ['Table-filling: mark pairs (q,r) where q in F, r not in F','Merge unmarked pairs -> minimal DFA','Myhill-Nerode: min states = equivalence classes','Pumping Lemma (Regular): w=xyz, |xy|<=p, |y|>=1, xy^iz in L','Use pumping lemma to prove non-regularity'] },
      ]},
      { name: 'Context-Free Languages', topics: [
        { name: 'CFG & PDA', points: ['G = (V, Sigma, R, S): Variables, Terminals, Rules, Start','PDA = (Q, Sigma, Gamma, delta, q0, Z0, F)','L(PDA) = CFL (accept by empty stack or final state)','CNF: every rule A->BC or A->a','GNF: every rule A->aB1B2...Bk'] },
        { name: 'CFL Properties', points: ['Pumping Lemma CFL: w=uvxyz, |vxy|<=p, |vy|>=1, uv^ixy^iz in L','a^n b^n c^n is NOT CFL (use pumping lemma)','CFL is closed under: union, concatenation, Kleene star','NOT closed under: intersection, complement'] },
      ]},
      { name: 'Turing Machines & Decidability', topics: [
        { name: 'Decidability', points: ['Decidable: TM always halts (accepts or rejects)','RE (semi-decidable): TM accepts if w in L, may loop otherwise','Halting Problem: UNDECIDABLE - no TM decides it',"Rice's Theorem: any non-trivial property of TM language is undecidable",'Reductions: if A reduces to B, undecidability transfers'] },
      ]},
    ],
  },
  {
    id: 'compiler',
    title: 'Compiler Design',
    icon: 'CD',
    color: '#374151',
    lightColor: '#F3F4F6',
    sections: [
      { name: 'Compilation Phases', topics: [
        { name: 'All 6 Phases', points: ['1. Lexical Analysis: source -> token stream','2. Syntax Analysis (Parser): tokens -> parse tree','3. Semantic Analysis: type checking, scope resolution','4. Intermediate Code Generation: 3-address code','5. Code Optimization: improve IC','6. Code Generation: IC -> target machine code','Symbol Table used throughout all phases'] },
      ]},
      { name: 'Parsing', topics: [
        { name: 'Top-Down (LL)', points: ['LL(1): Left-to-right scan, Leftmost derivation, 1 lookahead','FIRST(X): terminals that can start strings derived from X','FOLLOW(X): terminals that can appear immediately after X','LL(1) table: no conflicts = grammar is LL(1)','Recursive descent: simple top-down parser'] },
        { name: 'Bottom-Up (LR)', points: ['LR(0) < SLR(1) < LALR(1) < CLR(1) in power','LALR(1) used in YACC/Bison - most practical','LR parsing: shift and reduce operations','Conflicts: shift-reduce and reduce-reduce','LR parsers handle all unambiguous CFGs'] },
      ]},
      { name: 'Syntax-Directed Translation', topics: [
        { name: 'Attributes & Code', points: ['Synthesized attribute: value from children','Inherited attribute: value from parent or siblings','S-attributed SDD: only synthesized (works with LR)','L-attributed SDD: synthesized + left-inherited (works with LL)','Three-address code: x = y op z','Quadruple: (op, arg1, arg2, result)'] },
      ]},
      { name: 'Code Optimization', topics: [
        { name: 'Techniques', points: ['Constant folding: compute constant expressions at compile time','Dead code elimination: remove unreachable/unused code','CSE (Common Subexpression Elimination): reuse computed values','Loop invariant code motion: hoist loop-independent code','Strength reduction: x*2 -> x+x, x*4 -> x<<2','Inlining: replace function call with function body'] },
      ]},
    ],
  },
  {
    id: 'os',
    title: 'Operating Systems',
    icon: 'OS',
    color: '#0E7490',
    lightColor: '#CFFAFE',
    sections: [
      { name: 'CPU Scheduling', topics: [
        { name: 'Metrics', points: ['Turnaround Time = Completion - Arrival','Waiting Time = Turnaround - Burst','Response Time = First CPU - Arrival','Throughput = processes completed per unit time'] },
      ], table: {
        headers: ['Algorithm', 'Preemptive', 'Starvation', 'Key Property'],
        rows: [
          ['FCFS', 'No', 'No', 'Convoy effect; simple'],
          ['SJF', 'No', 'Yes', 'Optimal avg wait; needs future knowledge'],
          ['SRTF', 'Yes', 'Yes', 'Preemptive SJF; optimal avg wait'],
          ['Round Robin', 'Yes', 'No', 'Fair; time quantum critical'],
          ['Priority', 'Both', 'Yes', 'Aging solves starvation'],
          ['MLFQ', 'Yes', 'Possible', 'Approximates SRTF adaptively'],
        ],
      }},
      { name: 'Process Synchronization', topics: [
        { name: 'Critical Section & Semaphores', points: ['3 requirements: Mutual Exclusion, Progress, Bounded Waiting','Semaphore wait(): S>0 then S--; else block','Semaphore signal(): wake blocked; or S++','Binary semaphore = mutex (0 or 1)','Producer-Consumer: two semaphores (empty, full) + mutex','Deadlock conditions: Mutual Exclusion, Hold&Wait, No Preemption, Circular Wait'] },
        { name: 'Deadlock', points: ["Banker's Algorithm: safe state check for avoidance",'Prevention: deny one of 4 deadlock conditions','Detection: resource allocation graph or wait-for graph','Recovery: preempt resources, rollback, kill process'] },
      ]},
      { name: 'Memory Management', topics: [
        { name: 'Paging', points: ['Physical addr = frame_number * page_size + offset','TLB speeds up virtual-to-physical translation','2-level/multi-level page table for large address space','Inverted page table: one entry per frame'] },
        { name: 'Page Replacement', points: ['FIFO: replace oldest (Belady anomaly possible)','Optimal: replace page used farthest in future','LRU: replace least recently used (best practical)','Clock (Second Chance): efficient LRU approximation'] },
      ]},
      { name: 'File Systems', topics: [
        { name: 'Allocation & Disk', points: ['Contiguous: fast sequential access, external fragmentation','Linked: no external fragmentation, slow random access','Indexed (inode): direct + indirect + double-indirect blocks','Disk: FCFS simple, SSTF greedy, SCAN/CSCAN elevator'] },
      ]},
    ],
  },
  {
    id: 'dbms',
    title: 'Database Management Systems',
    icon: 'DB',
    color: '#1D4ED8',
    lightColor: '#DBEAFE',
    sections: [
      { name: 'Normalization', topics: [
        { name: 'Normal Forms', points: ['1NF: atomic values, no repeating groups','2NF: 1NF + no partial dependency on primary key','3NF: 2NF + no transitive dependency (non-key -> non-key)','BCNF: every determinant is a superkey (stricter than 3NF)','4NF: BCNF + no non-trivial multi-valued dependencies'] },
        { name: "Armstrong's Axioms & Closure", points: ['Reflexivity: Y subset X => X->Y','Augmentation: X->Y => XZ->YZ','Transitivity: X->Y and Y->Z => X->Z','Closure X+: all attributes functionally determined by X','Minimal cover: smallest equivalent set of FDs'] },
      ]},
      { name: 'SQL & Relational Algebra', topics: [
        { name: 'Relational Algebra', points: ['Select (sigma): filter rows by condition','Project (pi): select specific columns','Join (|><|): combine tuples from two relations','Natural Join: join on all common attributes and project','Division: find tuples related to ALL tuples in other relation','Rename (rho): rename relation or attributes'] },
        { name: 'SQL Tips', points: ['WHERE filters rows, HAVING filters groups','GROUP BY comes before HAVING','NULL in comparisons yields UNKNOWN','EXISTS returns true if subquery has any rows','DISTINCT removes duplicate rows in result','Subquery in FROM is called derived table'] },
      ]},
      { name: 'Transactions & Concurrency', topics: [
        { name: 'ACID & Serializability', points: ['Atomicity: all-or-nothing execution','Consistency: DB constraints always satisfied','Isolation: concurrent transactions appear serial','Durability: committed data survives system failure','Conflict Serializability: precedence graph must be acyclic','Two-Phase Locking (2PL): growing then shrinking phase'] },
      ]},
      { name: 'Indexing', table: {
        headers: ['Index Type', 'Description', 'Best For'],
        rows: [
          ['Dense', 'One entry per record', 'Exact match queries'],
          ['Sparse', 'One entry per block', 'Sequential/clustered data'],
          ['Primary', 'On primary key, clustered', 'Sorted key lookups'],
          ['Secondary', 'On non-key attribute', 'Multi-attribute queries'],
          ['B+ Tree', 'Balanced tree, data in leaves', 'Range queries, most common'],
          ['Hash Index', 'Hash function on key', 'Exact match only'],
        ],
      }},
    ],
  },
  {
    id: 'networks',
    title: 'Computer Networks',
    icon: 'CN',
    color: '#0F766E',
    lightColor: '#CCFBF1',
    sections: [
      { name: 'Network Models', table: {
        headers: ['OSI Layer', 'TCP/IP Layer', 'Key Protocols', 'PDU'],
        rows: [
          ['Application (7)', 'Application', 'HTTP, FTP, SMTP, DNS, DHCP, Telnet', 'Message'],
          ['Presentation (6)', 'Application', 'SSL/TLS, JPEG, ASCII', 'Message'],
          ['Session (5)', 'Application', 'NetBIOS, PPTP', 'Message'],
          ['Transport (4)', 'Transport', 'TCP, UDP', 'Segment'],
          ['Network (3)', 'Internet', 'IP, ICMP, ARP, RARP, Router', 'Packet'],
          ['Data Link (2)', 'Network Access', 'Ethernet, PPP, Switch, Bridge', 'Frame'],
          ['Physical (1)', 'Network Access', 'Hub, Cables, NIC, Repeater', 'Bits'],
        ],
      }},
      { name: 'IP Addressing & Routing', topics: [
        { name: 'Classes & Subnetting', points: ['Class A: /8 (0.x.x.x), Class B: /16 (128-191.x.x.x), Class C: /24','Usable hosts = 2^(host bits) - 2','Subnet mask: 255.255.255.0 = /24','CIDR allows non-classful subnetting','Private: 10.x, 172.16-31.x, 192.168.x'] },
        { name: 'Routing Protocols', points: ['RIP: distance vector, max 15 hops, slow convergence','OSPF: link state, fast convergence, Dijkstra algorithm','BGP: path vector, used between ISPs (inter-AS routing)','Classful routing ignores subnet mask'] },
      ]},
      { name: 'TCP vs UDP', table: {
        headers: ['Feature', 'TCP', 'UDP'],
        rows: [
          ['Connection', 'Connection-oriented (3-way handshake)', 'Connectionless'],
          ['Reliability', 'Reliable (ACK, retransmit)', 'Best effort'],
          ['Ordering', 'In-order delivery', 'No ordering guarantee'],
          ['Flow Control', 'Sliding window (receiver)','None'],
          ['Congestion', 'Slow start, AIMD', 'None'],
          ['Overhead', '20-60 byte header', '8 byte header'],
          ['Use Cases', 'HTTP, FTP, SMTP, SSH', 'DNS, VoIP, Video, Gaming'],
        ],
      }},
      { name: 'Error & Flow Control', topics: [
        { name: 'Protocols', points: ['Stop & Wait: efficiency = 1/(1+2a), a = propagation delay/transmission time','Go-Back-N: window size W <= 2^N - 1, retransmit all from error','Selective Repeat: window size W <= 2^(N-1), retransmit only lost frame','CRC error detection: polynomial division remainder = 0 means no error','Hamming code: corrects 1-bit, detects 2-bit errors'] },
      ]},
    ],
  },
];

function renderSection(sec, color) {
  let html = '<div class="section">';
  html += '<div class="section-title" style="background:' + color + '">' + sec.name + '</div>';
  html += '<div class="section-body" style="border-color:' + color + '40">';
  if (sec.table) {
    html += '<table><thead><tr>';
    sec.table.headers.forEach(h => { html += '<th>' + h + '</th>'; });
    html += '</tr></thead><tbody>';
    sec.table.rows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => { html += '<td>' + cell + '</td>'; });
      html += '</tr>';
    });
    html += '</tbody></table>';
  }
  if (sec.topics) {
    sec.topics.forEach(t => {
      html += '<div class="topic"><div class="topic-name">' + t.name + '</div><ul>';
      (t.points || t.topics || []).forEach(p => { html += '<li>' + p + '</li>'; });
      html += '</ul></div>';
    });
  }
  html += '</div></div>';
  return html;
}

function buildHTML(subj) {
  const sectionsHTML = subj.sections.map(s => renderSection(s, subj.color)).join('');
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>' + CSS + ' .page-header{border-color:' + subj.color + '} .page-header h1{color:' + subj.color + '} .page-header .icon{background:' + subj.color + '} .page-header .tag{background:' + subj.color + '}</style></head><body>' +
    '<div class="cover" style="background:linear-gradient(135deg,' + subj.color + '15 0%,' + subj.lightColor + ' 100%)">' +
    '<div class="cover-logo" style="background:' + subj.color + '">' + subj.icon + '</div>' +
    '<div class="badge" style="background:' + subj.color + '">GATE CS / IT 2027</div>' +
    '<h1>' + subj.title + '</h1><h2>Quick Revision Sheet</h2>' +
    '<p class="meta">Complete GATE syllabus coverage — All topics and subtopics</p>' +
    '<div class="brand">GATEFlow Preparation Platform</div></div>' +
    '<div class="page" style="page-break-before:always">' +
    '<div class="page-header"><div class="icon">' + subj.icon + '</div><h1>' + subj.title + '</h1><div class="tag">GATE CS/IT</div></div>' +
    sectionsHTML +
    '<div class="footer">GATEFlow Quick Revision Sheet | ' + subj.title + ' | GATE CS &amp; IT</div>' +
    '</div></body></html>';
}

(async () => {
  console.log('Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const subj of SUBJECTS) {
    console.log('Generating PDF: ' + subj.title + '...');
    const html = buildHTML(subj);
    const htmlPath = path.join(OUT_DIR, subj.id + '.html');
    const pdfPath = path.join(OUT_DIR, subj.id + '.pdf');
    fs.writeFileSync(htmlPath, html, 'utf8');
    const page = await browser.newPage();
    await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
    });
    await page.close();
    fs.unlinkSync(htmlPath);
    console.log('Done: ' + pdfPath);
  }

  await browser.close();
  console.log('All PDFs generated!');
})();
