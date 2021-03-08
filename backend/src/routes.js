const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const natural = require('natural');
const slugify = require('slugify');
const { v4: uuidv4 } = require('uuid');
const routes = require("express").Router();

const Utils = require('./utils/utils');
const termFrequency = require("./utils/term-frequency");
const booleanSearch = require("./utils/boolean-search");
const vetorialSearch = require("./utils/vetorial-search");
const stopwords = require('./resources/stopwords');
const uploadDocMiddleware = require('./middlewares/uploadDoc');

const databasePath = path.resolve(__dirname, "resources", "data");
const docsPath = path.resolve(__dirname, "..", "tmp", "uploads");

const EXTENSION_FILE = ['html', 'txt'];
const ENCONDE_FILE = [ 'utf8', 'ascii', 'latin1' ];
const RESERVED_WORDS = [ 'AND', 'OR', 'NEAR', 'NOT', '(', ')', ',' ];

routes.post("/corpus", async (req, res) => {
  
  const uuid = uuidv4();
  const name = req.body.name || 'corpus-default';
  const stemming = !!req.body.stemming || false;
  const timestamp = new Date().toISOString();
  const filename = `${uuid}-${slugify(name)}.json`;
  
  try {
    let listCorpus = fs.readFileSync(`${databasePath}/list.json`, "utf8");
    listCorpus = JSON.parse(listCorpus);
    listCorpus.push({ uuid, name, stemming, timestamp, filename })

    await Promise.all([
      Utils.writeFile(JSON.stringify(listCorpus)
        , `${databasePath}/list.json`, fs),

      Utils.writeFile(JSON.stringify({ uuid, name, stemming, timestamp, docsList: [] })
        , `${databasePath}/corpus/${filename}`, fs),

      Utils.writeFile(JSON.stringify([])
        , `${databasePath}/corpus-index/${filename}`, fs)
    ]);

    fs.mkdirSync(`${docsPath}/${uuid}`);
    
    return res.json({ uuid, name, stemming, timestamp, filename });
  } catch (err) {
    return res.status(400).send({error: 'Registration failed'});
  }
});

routes.get("/corpus", async (req, res) => {
  try{
    let listCorpus = fs.readFileSync(`${databasePath}/list.json`, "utf8");
    listCorpus = JSON.parse(listCorpus);

    return res.json(listCorpus);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({error: err.message});
    } else {
      res.status(400).json({error: 'Unknown error'});
    }
  }
});

routes.get("/corpus/:uuid", async (req, res) => {
  try{
    if (!req.params.uuid) {
      throw new Error('ID do corpus é obrigatorio');
    }

    let listCorpus = fs.readFileSync(`${databasePath}/list.json`, "utf8");
    listCorpus = JSON.parse(listCorpus);

    const corpus = _.find(listCorpus, { uuid: req.params.uuid });

    if (!corpus) {
      throw new Error(`Corpus não encontrado para o id: ${req.params.uuid}`);
    }

    let corpusInfo = fs.readFileSync(`${databasePath}/corpus/${corpus.filename}`, "utf8");
    corpusInfo = JSON.parse(corpusInfo);

    return res.json(corpusInfo);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({error: err.message});
    } else {
      res.status(400).json({error: 'Unknown error'});
    }
  }
});

routes.get("/corpus/:uuid/index", async (req, res) => {
  try{
    if (!req.params.uuid) {
      throw new Error('ID do corpus é obrigatorio');
    }

    let listCorpus = fs.readFileSync(`${databasePath}/list.json`, "utf8");
    listCorpus = JSON.parse(listCorpus);

    const corpus = _.find(listCorpus, { uuid: req.params.uuid });

    if (!corpus) {
      throw new Error(`Corpus não encontrado para o id: ${req.params.uuid}`);
    }

    let corpusIndex = fs.readFileSync(`${databasePath}/corpus-index/${corpus.filename}`, "utf8");
    corpusIndex = JSON.parse(corpusIndex);

    return res.json(corpusIndex);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({error: err.message});
    } else {
      res.status(400).json({error: 'Unknown error'});
    }
  }
});

routes.get("/corpus/:uuid/vetorial-index", async (req, res) => {
  try{
    if (!req.params.uuid) {
      throw new Error('ID do corpus é obrigatorio');
    }

    let listCorpus = fs.readFileSync(`${databasePath}/list.json`, "utf8");
    listCorpus = JSON.parse(listCorpus);

    const corpus = _.find(listCorpus, { uuid: req.params.uuid });

    if (!corpus) {
      throw new Error(`Corpus não encontrado para o id: ${req.params.uuid}`);
    }

    let corpusIndex = fs.readFileSync(`${databasePath}/corpus-index-vetorial/${corpus.filename}`, "utf8");
    corpusIndex = JSON.parse(corpusIndex);

    return res.json(corpusIndex);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({error: err.message});
    } else {
      res.status(400).json({error: 'Unknown error'});
    }
  }
});

routes.get("/corpus/:uuid/list-docs", async (req, res) => {
  try{
    if (!req.params.uuid) {
      throw new Error('ID do corpus é obrigatorio');
    }

    let listCorpus = fs.readFileSync(`${databasePath}/list.json`, "utf8");
    listCorpus = JSON.parse(listCorpus);

    const corpus = _.find(listCorpus, { uuid: req.params.uuid });

    if (!corpus) {
      throw new Error(`Corpus não encontrado para o id: ${req.params.uuid}`);
    }

    let corpusInfo = fs.readFileSync(`${databasePath}/corpus/${corpus.filename}`, "utf8");
    corpusInfo = JSON.parse(corpusInfo);

    return res.json(corpusInfo.docsList);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({error: err.message});
    } else {
      res.status(400).json({error: 'Unknown error'});
    }
  }
});

routes.post("/corpus/:uuid/vetorial-index", async (req, res) => {
  try{
    if (!req.params.uuid) {
      throw new Error('ID do corpus é obrigatorio');
    }
    
    /** Pegar informações do corpus alvo */
    let listCorpus = fs.readFileSync(`${databasePath}/list.json`, "utf8");
    listCorpus = JSON.parse(listCorpus);

    const corpus = _.find(listCorpus, { uuid: req.params.uuid });

    if (!corpus) {
      throw new Error(`Corpus não encontrado para o id: ${req.params.uuid}`);
    }

    /** Pegar index do corpus */
    let corpusIndex = fs.readFileSync(`${databasePath}/corpus-index/${corpus.filename}`, "utf8");
    corpusIndex = JSON.parse(corpusIndex);

    /** Pegar lista dos documentos no corpus */
    let corpusInfo = fs.readFileSync(`${databasePath}/corpus/${corpus.filename}`);
    corpusInfo = JSON.parse(corpusInfo);

    const vetorialIndex = vetorialSearch.generate(corpusIndex, corpusInfo.docsList);

    corpusInfo.vetorialIndex = true;
    corpusInfo.timestampVetorialIndex = new Date().toISOString();

    await Promise.all([
      Utils.writeFile(JSON.stringify({ ...corpusInfo })
        , `${databasePath}/corpus/${corpus.filename}`, fs),

      Utils.writeFile(JSON.stringify(vetorialIndex)
        , `${databasePath}/corpus-index-vetorial/${corpus.filename}`, fs)
    ]);

    return res.json({ 
      uuid: corpus.uuid,
      name: corpus.name, 
      stemming: corpus.stemming,
      filename: corpus.filename
    });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({error: err.message});
    } else {
      res.status(400).json({error: 'Unknown error'});
    }
  }
});

routes.post("/corpus/:uuid/docs", uploadDocMiddleware, async (req, res) => {
  try {
    const { originalname, key: filename } = req.file;
    const { uuid, name: nameCorpus, filename: filenameCorpus, stemming = false } = req.corpusData;

    /** Cadastrar doc no corpus */
    let infoCorpus = fs.readFileSync(`${databasePath}/corpus/${filenameCorpus}`, "utf8");
    infoCorpus = JSON.parse(infoCorpus);
    
    const docId = infoCorpus.docsList.length;
    infoCorpus.docsList.push({ 
      id: docId,
      docName: originalname,
      filename
    });

    /** Computar termos do doc */
    let docData = fs.readFileSync(`${docsPath}/${uuid}/${filename}`, 
      (ENCONDE_FILE.includes(req.body.encode)) ? req.body.encode : 'utf8'
    );

    const termsInfo = termFrequency.generate(docData, 
      (EXTENSION_FILE.includes(req.body.mode)) ? req.body.mode : 'txt', 
      stemming
    );

    /** Cadastrar termos no arquivo de indice invertido */
    let indexInverted = fs.readFileSync(`${databasePath}/corpus-index/${filenameCorpus}`, "utf8");
    indexInverted = JSON.parse(indexInverted);

    for (let key in termsInfo) {
      const id = _.findIndex(indexInverted, { termo: key });
      if (id === -1) {
        indexInverted.push({ 
          termo: key, 
          docs: [ docId ], 
          posix: {
            [docId]: termsInfo[key]
          } 
        });
      } else {
        indexInverted[id].docs.push(docId);
        indexInverted[id].posix[docId] = termsInfo[key];
      }
    }

    await Promise.all([
      Utils.writeFile(JSON.stringify(infoCorpus)
        , `${databasePath}/corpus/${filenameCorpus}`, fs),

      Utils.writeFile(JSON.stringify(indexInverted)
        , `${databasePath}/corpus-index/${filenameCorpus}`, fs)
    ]);

    return res.json({ 
      uuid,
      name: nameCorpus, 
      stemming, 
      docId,
      docName: originalname,
      filename
    });

  } catch (err) {
    return res.status(400).send({error: 'Failed'});
  }
});

routes.post("/corpus/:uuid/boolean-search", async (req, res) => {
  try{
    if (!req.params.uuid) {
      throw new Error('ID do corpus é obrigatorio');
    }

    /** Pegar informações do corpus alvo */
    let listCorpus = fs.readFileSync(`${databasePath}/list.json`, "utf8");
    listCorpus = JSON.parse(listCorpus);

    const corpus = _.find(listCorpus, { uuid: req.params.uuid });

    if (!corpus) {
      throw new Error(`Corpus não encontrado para o id: ${req.params.uuid}`);
    }

    /** Pegar index do corpus */
    let corpusIndex = fs.readFileSync(`${databasePath}/corpus-index/${corpus.filename}`);
    corpusIndex = JSON.parse(corpusIndex);

    /** Pegar lista dos documentos no corpus */
    let corpusInfo = fs.readFileSync(`${databasePath}/corpus/${corpus.filename}`);
    corpusInfo = JSON.parse(corpusInfo);

    const arrDocId = corpusInfo.docsList.map((value) => value.id);

    /** Adicionar termo default para o index */
    corpusIndex.push({"termo":"*","docs":[],"posix":{}});

    /** Traduzir Consulta do usuario */
    natural.PorterStemmerPt.attach();
    let sanitizeQuery = '';

    if (req.body.typeQuery === 'advanced') {
      const queryString = req.body.query;
      sanitizeQuery = queryString.replace(/([a-zØ-öø-ÿ]+)/g, (match, p1, offset, string) => {
        let word = corpusInfo.stemming ? p1.stem() : p1;
        let idxReplace = _.findIndex(corpusIndex, { termo: word });

        if (idxReplace === -1) idxReplace = corpusIndex.length - 1;
        return idxReplace;
      });
    } else if (req.body.typeQuery === 'keyboard') {
      const queryArr = req.body.query;
      sanitizeQuery = queryArr.map((value) => {
        if (RESERVED_WORDS.includes(value) || /^\d+$/.test(value)) return value;
        else {
          let word = corpusInfo.stemming ? value.stem() : value;
          let idxReplace = _.findIndex(corpusIndex, { termo: word });

          if (idxReplace === -1) idxReplace = corpusIndex.length - 1;
          return idxReplace;
        }
      }).join(' ');
    } else {
      throw new Error(`Especifique algum tipo de busca valido`);
    }

    booleanSearch.setIndexConj(corpusIndex);
    booleanSearch.setListDocs(arrDocId);

    const searchResult = booleanSearch.evaluateQuery(sanitizeQuery);

    const listDocsResult = corpusInfo.docsList.filter((value) => searchResult.docs.includes(value.id));

    res.json({docsList: listDocsResult});
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({error: err.message});
    } else {
      res.status(400).json({error: 'Unknown error'});
    }
  }
});

routes.post("/corpus/:uuid/vetorial-search", async (req, res) => {
  try{
    if (!req.params.uuid) {
      throw new Error('ID do corpus é obrigatorio');
    }

    /** Pegar informações do corpus alvo */
    let listCorpus = fs.readFileSync(`${databasePath}/list.json`, "utf8");
    listCorpus = JSON.parse(listCorpus);

    const corpus = _.find(listCorpus, { uuid: req.params.uuid });

    if (!corpus) {
      throw new Error(`Corpus não encontrado para o id: ${req.params.uuid}`);
    }

    /** Pegar index do corpus */
    let corpusIndex = fs.readFileSync(`${databasePath}/corpus-index-vetorial/${corpus.filename}`);
    corpusIndex = JSON.parse(corpusIndex);

    /** Pegar lista dos documentos no corpus */
    let corpusInfo = fs.readFileSync(`${databasePath}/corpus/${corpus.filename}`);
    corpusInfo = JSON.parse(corpusInfo);

    /** Traduzir Consulta do usuario */
    natural.PorterStemmerPt.attach();
    let sanitizeQuery = [];

    const queryString = req.body.query || '';
    sanitizeQuery = queryString.toLowerCase().trim().split(/\s+/).filter( word => {
      return !stopwords.includes(word);
    }).map( word => {
      return corpusInfo.stemming ? word.stem() : word;
    });

    const searchResult = vetorialSearch.search(sanitizeQuery, corpusIndex);

    /** Pegar informações de cada documento e ordernar o score */
    const listDocsResult = corpusInfo.docsList.map((docInfo) => {
      const docResult = _.find(searchResult, { id: docInfo.id });
      if (docResult) {
        docInfo.score = docResult.score;
        return docInfo;
      } else return false;
    }).filter((v) => !!v).sort((docA, docB) => docB.score - docA.score);

    res.json({docsList: listDocsResult});
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({error: err.message});
    } else {
      res.status(400).json({error: 'Unknown error'});
    }
  }
});

module.exports = routes;
