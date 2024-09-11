import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const SelectPaginated = ({ 

    options            = null,
    isLinearArray      = false ,
    pageSize           = 50,  
    
    api : { 
        resourceUrl   = null, 
        pageParamKey  = "_page", 
        limitParamKey = "_limit", 
    },
    
    onSelect, 
    onRemove ,
    multiSelect        = false,
    searchPlaceholder  = "Search...",
    displayKey         = "name",
    localStorageKey    = "dropdownData"
    
    }) => {

    var [items, setItems]                 = useState([]);
    var [searchTerm, setSearchTerm]       = useState('');
    var [currentPage, setCurrentPage]     = useState(1);
    var [loading, setLoading]             = useState(false);
    var [pagesFetched, setPagesFetched]   = useState(new Set());
    var [isOpen, setIsOpen]               = useState(false);
    var [selectedItems, setSelectedItems] = useState([]);
    var SelectPaginatedRef                = useRef(null);
    var FetchedInitialFlag                = useRef(false);
    var [isEndReached, setIsEndReached]   = useState(false); // Track if end of data is reached
    var [totalPage,setTotalPage]          = useState(Infinity);

    useEffect(() => {
        if (!resourceUrl && !options) {
          alert('select-paginated :: Resource URL or data prop is required');
          return;
        }
        try {
            const locStore = JSON.parse(localStorage.getItem(localStorageKey)) || {};
            if (Object.keys(locStore).length > 0) {
              const allItems = Object.values(locStore).flat();
              setItems(allItems);
              setPagesFetched(new Set(Object.keys(locStore).map(Number)));
              const totalItems = allItems.length;
              const totalPages = Math.ceil(totalItems / pageSize);
              setTotalPage(totalPages);
              
            } 
            else if (!FetchedInitialFlag.current) {
              if (options) {
                  initializeWithData(options);
              } else {
                  fetchPage(1);
              }
              FetchedInitialFlag.current = true;
            }
        } catch (error) {
            console.error('Error fetching items from localStorage:', error);
        } finally {
            setLoading(false);
        }
    }, [resourceUrl, options]);

    
    const CheckIfDataIsAsExpected = (data, isLinearArray) => {
      if (data.length === 0) return true; 
      const isArrayLinear = data.every(item => typeof item !== 'object');
      const isArrayObjects = data.every(item => typeof item === 'object');
      return isLinearArray ? isArrayLinear : isArrayObjects;
  };
  
   const initializeWithData = (data) => {

        if (!CheckIfDataIsAsExpected(data, isLinearArray)) {
          const expectedType = isLinearArray ? 'linear array' : 'array of objects';
          alert(`Provided data format does not match the value of isLinearArray. Expected ${expectedType}.`);
          setIsEndReached(true);
          return;
        }
  

        const paginatedData = {};
        let pageIndex = 1;
        for (let i = 0; i < data.length; i += pageSize) {
            paginatedData[pageIndex] = data.slice(i, i + pageSize);
            pageIndex++;
        }
        const totalPage = Math.ceil(data.length / pageSize);
        setTotalPage(totalPage);
        setItems(data);
        setPagesFetched(new Set(Object.keys(paginatedData).map(Number)));
        localStorage.setItem(localStorageKey, JSON.stringify(paginatedData));
    };

    useEffect(() => {
      if(totalPage!=null){
        if(currentPage == totalPage){
            setIsEndReached(true);        
        }
      }
    }, [currentPage]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (SelectPaginatedRef.current && !SelectPaginatedRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [SelectPaginatedRef]);

    const fetchApiCall = async (pageIndex, pageSize) => {

        const url = new URL(resourceUrl);
        url.searchParams.set(pageParamKey, pageIndex);
        url.searchParams.set(limitParamKey, pageSize);
        // const response = await fetch(url.toString(),{credentials: "include"});
        // const data     = await response.json();
        // return data;
        try {
          const response = await fetch(url.toString(),{credentials: "include"});
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          const data = await response.json();
          return data;
        } catch (error) {
          console.error("Fetch error:", error.message);
          alert(`select-paginated(check devtools) :: ${error.message}`);
          return;
        }
    };

    const fetchPage = async (pageIndex) => {
        setLoading(true);
        try {
            var locStore = {};
            if((localStorage.getItem(localStorageKey))){
                var locStore = JSON.parse(localStorage.getItem(localStorageKey)); 
            }
            if (locStore[pageIndex]) {
                setItems((prevItems) => [...prevItems, ...locStore[pageIndex]]);
                setPagesFetched((prevPages) => new Set([...prevPages, pageIndex]));
            } else {

                const ApiResponseData       = await fetchApiCall(pageIndex, pageSize);
                
                if (!CheckIfDataIsAsExpected(ApiResponseData, isLinearArray)) {
                  const expectedType = isLinearArray ? 'Linear-array' : 'Array of objects';
                  alert(`API response data format does not match the value of Component prop 'isLinearArray'. Expected ${expectedType}.`);
                  setIsEndReached(true);
                  return;
                }
                
                if(ApiResponseData){
                  
                  if (ApiResponseData.length === 0) {
                      setTotalPage(pageIndex-1);
                      setCurrentPage(currentPage--);
                      setIsEndReached(true);
                  } else {
                      var newItems = isLinearArray ? ApiResponseData.filter(item => !items.includes(item)) : ApiResponseData.filter(item => !items.some(existingItem => existingItem[displayKey] === item[displayKey]));
                      console.log(newItems.length);
                      if (newItems.length > 0) {
                          setItems((prevItems) => [...prevItems, ...newItems]);
                          setPagesFetched((prevPages) => new Set([...prevPages, pageIndex]));
                          locStore[pageIndex] = newItems;
                          localStorage.setItem(localStorageKey, JSON.stringify(locStore));
                      }else if(newItems.length < 1){
                          setTotalPage(pageIndex-1);
                          setCurrentPage(currentPage--);
                          setIsEndReached(true);
                      }
                  }
                }else{
                  setTotalPage(pageIndex-1);
                  setCurrentPage(currentPage--);
                  setIsEndReached(true);
                }
            }
        } catch (error) {
            console.error('Error fetching items:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setIsOpen(true);
    };

    const handleNextPage = () => {
      const nextPage = currentPage + 1;
      if (options == null && resourceUrl != null ) {
          if (!pagesFetched.has(nextPage) && !isEndReached) {
              fetchPage(nextPage);
          }
      } 
      //else {
          if (nextPage > totalPage) {
              setIsEndReached(true);
          }
      //}
      //console.log(nextPage);
      //console.log(totalPage);
      setCurrentPage(nextPage);
    };

    const handlePrevPage = () => {
        const prevPage = currentPage - 1;
        setCurrentPage(prevPage);
        setIsEndReached(false);
    };

    var handleItemClick = (clickedItem) => {
        if (multiSelect) {
            
            setSelectedItems((prevItems) => {
                const isPreviouslySelected = isLinearArray
                    ? prevItems.includes(clickedItem)
                    : prevItems.some(selectedItem => selectedItem[displayKey] === clickedItem[displayKey]);
                const finalItems = isPreviouslySelected
                    ? isLinearArray ? prevItems.filter(selectedItem => selectedItem !== clickedItem)
                        : prevItems.filter(selectedItem => selectedItem[displayKey] !== clickedItem[displayKey])
                    : [...prevItems, clickedItem];
                
                return finalItems;
            });

            const isPreviouslySelected = isLinearArray
            ? selectedItems.includes(clickedItem)
            : selectedItems.some(selectedItem => selectedItem[displayKey] === clickedItem[displayKey]);
            if (isPreviouslySelected && onRemove) {
                onRemove(clickedItem);
            }
            
        } else {
            const finalItems = [clickedItem];
            setSelectedItems(finalItems);
            setIsOpen(false);
        }
    };

    var DeSelectSingleItem = (item) => {
        const newSelectedItems = isLinearArray
            ? selectedItems.filter(i => i !== item)
            : selectedItems.filter(i => i[displayKey] !== item[displayKey]);
        setSelectedItems(newSelectedItems);
        
        if (onRemove) {
            onRemove(item);
        }
    };
    
    var DeSelectAllItem = () => {
        setSelectedItems([]);
        setSearchTerm('');
        if (onSelect) {
            onSelect(null);
        }
    };

    useEffect(() => {
        if (onSelect) {
            onSelect(selectedItems);
        }
    }, [selectedItems, onSelect]);

    const filteredItems = searchTerm ? 
                          items.filter((item) => isLinearArray ? item.toLowerCase().includes(searchTerm.toLowerCase()) : item[displayKey] && item[displayKey].toString().toLowerCase().includes(searchTerm.toLowerCase()))
                        : items;

    var paginatedItems =!searchTerm ? 
                        filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize) 
                        : filteredItems;
    var uniqueKey  = 1;
    var uniqueKey1 = 1;


    var error = null;
    const validateItems = (items) => {
      const result = items.map((item) => {
        if (isLinearArray) {
          if (typeof item === "object") {
            error = ("isLinearArray is true, but item is an object");
            return error; 
          }
          return item;
        } else {
          if (typeof item !== "object") {
            error = ("isLinearArray is false, but item is not an object");
            return error; 
          }
          if (!item.hasOwnProperty(displayKey)) {
            error = (`fetched Item does not have property '${displayKey}'`);
            return error; 
          }
          return item;
        }
      });
      return result;
    };
    const validatedItems = validateItems(paginatedItems);

    var errorCount = 0;
    const CountInvalidOptions = (items) => {
      items.forEach(item => {
        if (isLinearArray) {
          if (typeof item === "object") {
            errorCount++;
          }
        } else {
          if (typeof item !== "object") {
            errorCount++;
          }
          if (!item.hasOwnProperty(displayKey)) {
            errorCount++;
          }
        }  
      });
    };
    CountInvalidOptions(items);
   
    var placeholderText = `${searchPlaceholder} (${items.length} options)`;
    
    return (
        
        <div className="dropdown" ref={SelectPaginatedRef}>
           
            <div className="selected-item-list">
                {selectedItems.map(item => (
                    <>
                      <span key={uniqueKey1++} className="selected-item">
                          <button style={{cursor: "pointer" }} onClick={() => DeSelectSingleItem(item)}>&#x2715;</button> &nbsp;
                          {isLinearArray ? item : item[displayKey]}
                      </span> 
                      &nbsp;&nbsp;
                    </>
                ))}
            </div>
            
            
            <div style={{ display: 'flex' }}>
                <input className="searchField" type="text" value={searchTerm}
                  onChange={handleSearch} 
                  placeholder={placeholderText}  
                  onClick={() => setIsOpen(true)}
                />
                <span style={{color: selectedItems.length > 0 ? "red" : '',padding: "8px 0px 0px 0px"}}>[{selectedItems.length}]</span>
                <button className="deselectAllButton" style={{color: selectedItems.length > 0 ? "red" : ''  }} 
                    onClick={DeSelectAllItem} disabled={selectedItems.length === 0}>
                    &#x2715;
                </button>
            </div>

            { isOpen  && (
              <ul className="dropdown-list">
                <div key={uniqueKey++} className="paginationBar">
                    <button className="PrevPageButton" onClick={handlePrevPage} disabled={currentPage === 1}>◀</button>
                    <span> {currentPage}/{pagesFetched.size} </span>
                    {loading && <p style={{ height: "28px", width: "30px" }}>Loading...</p>}
                    <button className='NextPageButton' onClick={handleNextPage} disabled={isEndReached}>◀</button>
                </div>
                { validatedItems && validatedItems.length > 0 && validatedItems.map((item, index) => (
                  item !== null ? 
                  (
                    <li className="listItem" key={uniqueKey++} onClick={() => handleItemClick(validatedItems[index])}
                      style={{ background: selectedItems.includes(validatedItems[index]) ? 'lightgray' : 'white'}} >
                      :: { isLinearArray ?  item : typeof item === "object" ? item[displayKey] : <span style={{color:'red'}}> {item} </span> }
                    </li>
                  ) 
                  : 
                  <> <li  className="listItem"> <strong> error :: Null or  Data format miss-match, Check devtools</strong> </li> </>
                ))}
              </ul>
            )}
            
        </div>

    );
};

const App = () => {
    
    var data=[
      
        {
          "postId": 1,
          "id": 3,
          "name": "odio adipisci rerum aut animi",
          "email": "Nikita@garfield.biz",
          "body": "quia molestiae reprehenderit quasi aspernatur\naut expedita occaecati aliquam eveniet laudantium\nomnis quibusdam delectus saepe quia accusamus maiores nam est\ncum et ducimus et vero voluptates excepturi deleniti ratione"
        },
        {
          "postId": 1,
          "id": 4,
          "name": "alias odio sit",
          "email": "Lew@alysha.tv",
          "body": "non et atque\noccaecati deserunt quas accusantium unde odit nobis qui voluptatem\nquia voluptas consequuntur itaque dolor\net qui rerum deleniti ut occaecati"
        },
        {
          "postId": 1,
          "id": 5,
          "name": "vero eaque aliquid doloribus et culpa",
          "email": "Hayden@althea.biz",
          "body": "harum non quasi et ratione\ntempore iure ex voluptates in ratione\nharum architecto fugit inventore cupiditate\nvoluptates magni quo et"
        },
        {
          "postId": 2,
          "id": 6,
          "name": "et fugit eligendi deleniti quidem qui sint nihil autem",
          "email": "Presley.Mueller@myrl.com",
          "body": "doloribus at sed quis culpa deserunt consectetur qui praesentium\naccusamus fugiat dicta\nvoluptatem rerum ut voluptate autem\nvoluptatem repellendus aspernatur dolorem in"
        },
        {
          "postId": 2,
          "id": 7,
          "name": "repellat consequatur praesentium vel minus molestias voluptatum",
          "email": "Dallas@ole.me",
          "body": "maiores sed dolores similique labore et inventore et\nquasi temporibus esse sunt id et\neos voluptatem aliquam\naliquid ratione corporis molestiae mollitia quia et magnam dolor"
        },
        {
          "postId": 2,
          "id": 8,
          "name": "et omnis dolorem",
          "email": "Mallory_Kunze@marie.org",
          "body": "ut voluptatem corrupti velit\nad voluptatem maiores\net nisi velit vero accusamus maiores\nvoluptates quia aliquid ullam eaque"
        },
        {
          "postId": 2,
          "id": 9,
          "name": "provident id voluptas",
          "email": "Meghan_Littel@rene.us",
          "body": "sapiente assumenda molestiae atque\nadipisci laborum distinctio aperiam et ab ut omnis\net occaecati aspernatur odit sit rem expedita\nquas enim ipsam minus"
        },
        {
          "postId": 2,
          "id": 10,
          "name": "eaque et deleniti atque tenetur ut quo ut",
          "email": "Carmen_Keeling@caroline.name",
          "body": "voluptate iusto quis nobis reprehenderit ipsum amet nulla\nquia quas dolores velit et non\naut quia necessitatibus\nnostrum quaerat nulla et accusamus nisi facilis"
        },
        {
          "postId": 3,
          "id": 11,
          "name": "fugit labore quia mollitia quas deserunt nostrum sunt",
          "email": "Veronica_Goodwin@timmothy.net",
          "body": "ut dolorum nostrum id quia aut est\nfuga est inventore vel eligendi explicabo quis consectetur\naut occaecati repellat id natus quo est\nut blanditiis quia ut vel ut maiores ea"
        },
        {
          "postId": 3,
          "id": 12,
          "name": "modi ut eos dolores illum nam dolor",
          "email": "Oswald.Vandervort@leanne.org",
          "body": "expedita maiores dignissimos facilis\nipsum est rem est fugit velit sequi\neum odio dolores dolor totam\noccaecati ratione eius rem velit"
        },
        {
          "postId": 3,
          "id": 13,
          "name": "aut inventore non pariatur sit vitae voluptatem sapiente",
          "email": "Kariane@jadyn.tv",
          "body": "fuga eos qui dolor rerum\ninventore corporis exercitationem\ncorporis cupiditate et deserunt recusandae est sed quis culpa\neum maiores corporis et"
        },
        {
          "postId": 3,
          "id": 14,
          "name": "et officiis id praesentium hic aut ipsa dolorem repudiandae",
          "email": "Nathan@solon.io",
          "body": "vel quae voluptas qui exercitationem\nvoluptatibus unde sed\nminima et qui ipsam aspernatur\nexpedita magnam laudantium et et quaerat ut qui dolorum"
        },
        {
          "postId": 3,
          "id": 15,
          "name": "debitis magnam hic odit aut ullam nostrum tenetur",
          "email": "Maynard.Hodkiewicz@roberta.com",
          "body": "nihil ut voluptates blanditiis autem odio dicta rerum\nquisquam saepe et est\nsunt quasi nemo laudantium deserunt\nmolestias tempora quo quia"
        },
        {
          "postId": 4,
          "id": 16,
          "name": "perferendis temporibus delectus optio ea eum ratione dolorum",
          "email": "Christine@ayana.info",
          "body": "iste ut laborum aliquid velit facere itaque\nquo ut soluta dicta voluptate\nerror tempore aut et\nsequi reiciendis dignissimos expedita consequuntur libero sed fugiat facilis"
        },
        {
          "postId": 4,
          "id": 17,
          "name": "eos est animi quis",
          "email": "Preston_Hudson@blaise.tv",
          "body": "consequatur necessitatibus totam sed sit dolorum\nrecusandae quae odio excepturi voluptatum harum voluptas\nquisquam sit ad eveniet delectus\ndoloribus odio qui non labore"
        },
        {
          "postId": 4,
          "id": 18,
          "name": "aut et tenetur ducimus illum aut nulla ab",
          "email": "Vincenza_Klocko@albertha.name",
          "body": "veritatis voluptates necessitatibus maiores corrupti\nneque et exercitationem amet sit et\nullam velit sit magnam laborum\nmagni ut molestias"
        },
        {
          "postId": 4,
          "id": 19,
          "name": "sed impedit rerum quia et et inventore unde officiis",
          "email": "Madelynn.Gorczany@darion.biz",
          "body": "doloribus est illo sed minima aperiam\nut dignissimos accusantium tempore atque et aut molestiae\nmagni ut accusamus voluptatem quos ut voluptates\nquisquam porro sed architecto ut"
        },
        {
          "postId": 4,
          "id": 20,
          "name": "molestias expedita iste aliquid voluptates",
          "email": "Mariana_Orn@preston.org",
          "body": "qui harum consequatur fugiat\net eligendi perferendis at molestiae commodi ducimus\ndoloremque asperiores numquam qui\nut sit dignissimos reprehenderit tempore"
        },
        {
          "postId": 5,
          "id": 21,
          "name": "aliquid rerum mollitia qui a consectetur eum sed",
          "email": "Noemie@marques.me",
          "body": "deleniti aut sed molestias explicabo\ncommodi odio ratione nesciunt\nvoluptate doloremque est\nnam autem error delectus"
        },
        {
          "postId": 5,
          "id": 22,
          "name": "porro repellendus aut tempore quis hic",
          "email": "Khalil@emile.co.uk",
          "body": "qui ipsa animi nostrum praesentium voluptatibus odit\nqui non impedit cum qui nostrum aliquid fuga explicabo\nvoluptatem fugit earum voluptas exercitationem temporibus dignissimos distinctio\nesse inventore reprehenderit quidem ut incidunt nihil necessitatibus rerum"
        },
        {
          "postId": 5,
          "id": 23,
          "name": "quis tempora quidem nihil iste",
          "email": "Sophia@arianna.co.uk",
          "body": "voluptates provident repellendus iusto perspiciatis ex fugiat ut\nut dolor nam aliquid et expedita voluptate\nsunt vitae illo rerum in quos\nvel eligendi enim quae fugiat est"
        },
        {
          "postId": 5,
          "id": 24,
          "name": "in tempore eos beatae est",
          "email": "Jeffery@juwan.us",
          "body": "repudiandae repellat quia\nsequi est dolore explicabo nihil et\net sit et\net praesentium iste atque asperiores tenetur"
        },
        
          "body",
        {
          "postId": 6,
          "id": 26,
          "name": "in deleniti sunt provident soluta ratione veniam quam praesentium",
          "email": "Russel.Parker@kameron.io",
          "body": "incidunt sapiente eaque dolor eos\nad est molestias\nquas sit et nihil exercitationem at cumque ullam\nnihil magnam et"
        },
        {
          "postId": 6,
          "id": 27,
          "name": "doloribus quibusdam molestiae amet illum",
          "email": "Francesco.Gleason@nella.us",
          "body": "nisi vel quas ut laborum ratione\nrerum magni eum\nunde et voluptatem saepe\nvoluptas corporis modi amet ipsam eos saepe porro"
        },
        {
          "postId": 6,
          "id": 28,
          "name": "quo voluptates voluptas nisi veritatis dignissimos dolores ut officiis",
          "email": "Ronny@rosina.org",
          "body": "voluptatem repellendus quo alias at laudantium\nmollitia quidem esse\ntemporibus consequuntur vitae rerum illum\nid corporis sit id"
        },
        {
          "postId": 6,
          "id": 29,
          "name": "eum distinctio amet dolor",
          "email": "Jennings_Pouros@erica.biz",
          "body": "tempora voluptatem est\nmagnam distinctio autem est dolorem\net ipsa molestiae odit rerum itaque corporis nihil nam\neaque rerum error"
        },
        {
          "postId": 6,
          "id": 30,
          "name": "quasi nulla ducimus facilis non voluptas aut",
          "email": "Lurline@marvin.biz",
          "body": "consequuntur quia voluptate assumenda et\nautem voluptatem reiciendis ipsum animi est provident\nearum aperiam sapiente ad vitae iste\naccusantium aperiam eius qui dolore voluptatem et"
        },
        {
          "postId": 7,
          "id": 31,
          "name": "ex velit ut cum eius odio ad placeat",
          "email": "Buford@shaylee.biz",
          "body": "quia incidunt ut\naliquid est ut rerum deleniti iure est\nipsum quia ea sint et\nvoluptatem quaerat eaque repudiandae eveniet aut"
        },
        {
          "postId": 7,
          "id": 32,
          "name": "dolorem architecto ut pariatur quae qui suscipit",
          "email": "Maria@laurel.name",
          "body": "nihil ea itaque libero illo\nofficiis quo quo dicta inventore consequatur voluptas voluptatem\ncorporis sed necessitatibus velit tempore\nrerum velit et temporibus"
        },
        {
          "postId": 7,
          "id": 33,
          "name": "voluptatum totam vel voluptate omnis",
          "email": "Jaeden.Towne@arlene.tv",
          "body": "fugit harum quae vero\nlibero unde tempore\nsoluta eaque culpa sequi quibusdam nulla id\net et necessitatibus"
        },
        {
          "postId": 7,
          "id": 34,
          "name": "omnis nemo sunt ab autem",
          "email": "Ethelyn.Schneider@emelia.co.uk",
          "body": "omnis temporibus quasi ab omnis\nfacilis et omnis illum quae quasi aut\nminus iure ex rem ut reprehenderit\nin non fugit"
        },
        {
          "postId": 7,
          "id": 35,
          "name": "repellendus sapiente omnis praesentium aliquam ipsum id molestiae omnis",
          "email": "Georgianna@florence.io",
          "body": "dolor mollitia quidem facere et\nvel est ut\nut repudiandae est quidem dolorem sed atque\nrem quia aut adipisci sunt"
        },
        {
          "postId": 8,
          "id": 36,
          "name": "sit et quis",
          "email": "Raheem_Heaney@gretchen.biz",
          "body": "aut vero est\ndolor non aut excepturi dignissimos illo nisi aut quas\naut magni quia nostrum provident magnam quas modi maxime\nvoluptatem et molestiae"
        },
        {
          "postId": 8,
          "id": 37,
          "name": "beatae veniam nemo rerum voluptate quam aspernatur",
          "email": "Jacky@victoria.net",
          "body": "qui rem amet aut\ncumque maiores earum ut quia sit nam esse qui\niusto aspernatur quis voluptas\ndolorem distinctio ex temporibus rem"
        },
        {
          "postId": 8,
          "id": 38,
          "name": "maiores dolores expedita",
          "email": "Piper@linwood.us",
          "body": "unde voluptatem qui dicta\nvel ad aut eos error consequatur voluptatem\nadipisci doloribus qui est sit aut\nvelit aut et ea ratione eveniet iure fuga"
        },
        {
          "postId": 8,
          "id": 39,
          "name": "necessitatibus ratione aut ut delectus quae ut",
          "email": "Gaylord@russell.net",
          "body": "atque consequatur dolorem sunt\nadipisci autem et\nvoluptatibus et quae necessitatibus rerum eaque aperiam nostrum nemo\neligendi sed et beatae et inventore"
        },
        {
          "postId": 8,
          "id": 40,
          "name": "non minima omnis deleniti pariatur facere quibusdam at",
          "email": "Clare.Aufderhar@nicole.ca",
          "body": "quod minus alias quos\nperferendis labore molestias quae ut ut corporis deserunt vitae\net quaerat ut et ullam unde asperiores\ncum voluptatem cumque"
        },
        {
          "postId": 9,
          "id": 41,
          "name": "voluptas deleniti ut",
          "email": "Lucio@gladys.tv",
          "body": "facere repudiandae vitae ea aut sed quo ut et\nfacere nihil ut voluptates in\nsaepe cupiditate accusantium numquam dolores\ninventore sint mollitia provident"
        },
        {
          "postId": 9,
          "id": 42,
          "name": "nam qui et",
          "email": "Shemar@ewell.name",
          "body": "aut culpa quaerat veritatis eos debitis\naut repellat eius explicabo et\nofficiis quo sint at magni ratione et iure\nincidunt quo sequi quia dolorum beatae qui"
        },
        {
          "postId": 9,
          "id": 43,
          "name": "molestias sint est voluptatem modi",
          "email": "Jackeline@eva.tv",
          "body": "voluptatem ut possimus laborum quae ut commodi delectus\nin et consequatur\nin voluptas beatae molestiae\nest rerum laborum et et velit sint ipsum dolorem"
        },
        {
          "postId": 9,
          "id": 44,
          "name": "hic molestiae et fuga ea maxime quod",
          "email": "Marianna_Wilkinson@rupert.io",
          "body": "qui sunt commodi\nsint vel optio vitae quis qui non distinctio\nid quasi modi dicta\neos nihil sit inventore est numquam officiis"
        },
        {
          "postId": 9,
          "id": 45,
          "name": "autem illo facilis",
          "email": "Marcia@name.biz",
          "body": "ipsum odio harum voluptatem sunt cumque et dolores\nnihil laboriosam neque commodi qui est\nquos numquam voluptatum\ncorporis quo in vitae similique cumque tempore"
        },
        {
          "postId": 10,
          "id": 46,
          "name": "dignissimos et deleniti voluptate et quod",
          "email": "Jeremy.Harann@waino.me",
          "body": "exercitationem et id quae cum omnis\nvoluptatibus accusantium et quidem\nut ipsam sint\ndoloremque illo ex atque necessitatibus sed"
        },
        {
          "postId": 10,
          "id": 47,
          "name": "rerum commodi est non dolor nesciunt ut",
          "email": "Pearlie.Kling@sandy.com",
          "body": "occaecati laudantium ratione non cumque\nearum quod non enim soluta nisi velit similique voluptatibus\nesse laudantium consequatur voluptatem rem eaque voluptatem aut ut\net sit quam"
        },
        {
          "postId": 10,
          "id": 48,
          "name": "consequatur animi dolorem saepe repellendus ut quo aut tenetur",
          "email": "Manuela_Stehr@chelsie.tv",
          "body": "illum et alias quidem magni voluptatum\nab soluta ea qui saepe corrupti hic et\ncum repellat esse\nest sint vel veritatis officia consequuntur cum"
        },
        {
          "postId": 10,
          "id": 49,
          "name": "rerum placeat quae minus iusto eligendi",
          "email": "Camryn.Weimann@doris.io",
          "body": "id est iure occaecati quam similique enim\nab repudiandae non\nillum expedita quam excepturi soluta qui placeat\nperspiciatis optio maiores non doloremque aut iusto sapiente"
        },
        {
          "postId": 10,
          "id": 50,
          "name": "dolorum soluta quidem ex quae occaecati dicta aut doloribus",
          "email": "Kiana_Predovic@yasmin.io",
          "body": "eum accusamus aut delectus\narchitecto blanditiis quia sunt\nrerum harum sit quos quia aspernatur vel corrupti inventore\nanimi dicta vel corporis"
        },
        {
          "postId": 11,
          "id": 51,
          "name": "molestias et odio ut commodi omnis ex",
          "email": "Laurie@lincoln.us",
          "body": "perferendis omnis esse\nvoluptate sit mollitia sed perferendis\nnemo nostrum qui\nvel quis nisi doloribus animi odio id quas"
        },
        {
          "postId": 11,
          "id": 52,
          "name": "esse autem dolorum",
          "email": "Abigail.OConnell@june.org",
          "body": "et enim voluptatem totam laudantium\nimpedit nam labore repellendus enim earum aut\nconsectetur mollitia fugit qui repellat expedita sunt\naut fugiat vel illo quos aspernatur ducimus"
        },
        {
          "postId": 11,
          "id": 53,
          "name": "maiores alias necessitatibus aut non",
          "email": "Laverne_Price@scotty.info",
          "body": "a at tempore\nmolestiae odit qui dolores molestias dolorem et\nlaboriosam repudiandae placeat quisquam\nautem aperiam consectetur maiores laboriosam nostrum"
        },
        {
          "postId": 11,
          "id": 54,
          "name": "culpa eius tempora sit consequatur neque iure deserunt",
          "email": "Kenton_Vandervort@friedrich.com",
          "body": "et ipsa rem ullam cum pariatur similique quia\ncum ipsam est sed aut inventore\nprovident sequi commodi enim inventore assumenda aut aut\ntempora possimus soluta quia consequatur modi illo"
        },
        {
          "postId": 11,
          "id": 55,
          "name": "quas pariatur quia a doloribus",
          "email": "Hayden_Olson@marianna.me",
          "body": "perferendis eaque labore laudantium ut molestiae soluta et\nvero odio non corrupti error pariatur consectetur et\nenim nam quia voluptatum non\nmollitia culpa facere voluptas suscipit veniam"
        },
        {
          "postId": 12,
          "id": 56,
          "name": "et dolorem corrupti sed molestias",
          "email": "Vince_Crist@heidi.biz",
          "body": "cum esse odio nihil reiciendis illum quaerat\nest facere quia\noccaecati sit totam fugiat in beatae\nut occaecati unde vitae nihil quidem consequatur"
        },
        {
          "postId": 12,
          "id": 57,
          "name": "qui quidem sed",
          "email": "Darron.Nikolaus@eulah.me",
          "body": "dolorem facere itaque fuga odit autem\nperferendis quisquam quis corrupti eius dicta\nrepudiandae error esse itaque aut\ncorrupti sint consequatur aliquid"
        },
        {
          "postId": 12,
          "id": 58,
          "name": "sint minus reiciendis qui perspiciatis id",
          "email": "Ezra_Abshire@lyda.us",
          "body": "veritatis qui nihil\nquia reprehenderit non ullam ea iusto\nconsectetur nam voluptas ut temporibus tempore provident error\neos et nisi et voluptate"
        },
        {
          "postId": 12,
          "id": 59,
          "name": "quis ducimus distinctio similique et illum minima ab libero",
          "email": "Jameson@tony.info",
          "body": "cumque molestiae officia aut fugiat nemo autem\nvero alias atque sed qui ratione quia\nrepellat vel earum\nea laudantium mollitia"
        },
        {
          "postId": 12,
          "id": 60,
          "name": "expedita libero quos cum commodi ad",
          "email": "Americo@estrella.net",
          "body": "error eum quia voluptates alias repudiandae\naccusantium veritatis maiores assumenda\nquod impedit animi tempore veritatis\nanimi et et officiis labore impedit blanditiis repudiandae"
        },
        {
          "postId": 13,
          "id": 61,
          "name": "quidem itaque dolores quod laborum aliquid molestiae",
          "email": "Aurelio.Pfeffer@griffin.ca",
          "body": "deserunt cumque laudantium\net et odit quia sint quia quidem\nquibusdam debitis fuga in tempora deleniti\nimpedit consequatur veniam reiciendis autem porro minima"
        }
    ];

    return (
    
        <div className="App">
    
            <SelectPaginated 
              //options       = {data}
              pageSize      = {10}
              isLinearArray = {true}
              api = {{
                  resourceUrl   : "https://server.shopex.io/products/product-get-list.php",
                  pageParamKey  : "page", 
                  limitParamKey : "limit",
              
              }}
              onSelect={(selectedItems) => {
                  console.log('selected items :: ', JSON.stringify(selectedItems));
              }}
              onRemove={(removedItem) => {
                  console.log('Removed items :: ', JSON.stringify(removedItem));
              }}
              multiSelect       = {true}
              searchPlaceholder = "Search..."
              displayKey        = "proname"
              localStorageKey   = "SelectFetchedData"
            />

        </div>

    );
    
};

export default App;
