var typeorm = require("typeorm");
var EntitySchema = typeorm.EntitySchema;
var fs = require("fs");

const Users = require("./entity/Users")

const mysqlPassword = process.env.MYSQL_PASSWORD_FILE
  ? fs.readFileSync(process.env.MYSQL_PASSWORD_FILE, "utf8").trim()
  : process.env.MYSQL_PASSWORD;

typeorm.createConnection({
  name: "mysql",
  type: "mysql",
  host: process.env.MYSQL_HOST || "localhost",
  port: 3306,
  username: process.env.MYSQL_USER || "goof",
  password: mysqlPassword,
  database: "acme",
  synchronize: true,
  "logging": true,
  entities: [
    new EntitySchema(Users)
  ]
}).then(() => {

  const dbConnection = typeorm.getConnection('mysql')

  const repo = dbConnection.getRepository("Users")
  return repo
}).then((repo) => {


  console.log('Seeding 2 users to MySQL users table: Liran (role: user), Simon (role: admin')
  const inserts = [
    repo.insert({
      name: "Liran",
      address: "IL",
      role: "user"
    }),
    repo.insert({
      name: "Simon",
      address: "UK",
      role: "admin"
    })
  ];

  return Promise.all(inserts)
}).catch((err) => {
  console.error('failed connecting and seeding users to the MySQL database')
  console.error(err)
})
